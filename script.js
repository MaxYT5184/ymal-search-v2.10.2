// ========================
// YMAL SEARCH ENGINE v2.0
// Professional Edition
// ========================

// Configuration
const SEARCH_API_URL = 'https://search.unlocked.link/search';
const PROMOTED_DATA_URL = 'promoted.json'; // You need to create this file
const RESULTS_PER_PAGE = 10;
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Ymal Search v2.0 initialized');
    initializeSearch();
    setupDarkMode();
    setupSearchSuggestions();
    setupQuickSearch();
});

// Initialize search from URL
function initializeSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const page = parseInt(urlParams.get('page')) || 1;
    
    currentQuery = query || '';
    currentPage = page;
    
    // Update search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && currentQuery) {
        searchInput.value = currentQuery;
        document.title = `${currentQuery} - Ymal Search`;
    }
    
    // Perform search if query exists
    if (currentQuery.trim()) {
        performSearch(currentQuery, currentPage);
    } else if (window.location.pathname.includes('search.html')) {
        // No query on search page, redirect home
        window.location.href = 'index.html';
    }
}

// Main search function with pagination
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    
    currentQuery = query;
    currentPage = page;
    
    // Update URL without reloading for pagination
    updateURL(query, page);
    
    // Show loading animation
    showLoadingAnimation(query, page, resultsContainer);
    
    try {
        // Get promoted results (from your JSON file)
        const promotedResults = await fetchPromotedResults(query);
        
        // Get organic results from SearxNG
        const response = await fetch(
            `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&format=json&language=en&pageno=${page}`,
            {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000)
            }
        );
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        totalResults = data.number_of_results || 0;
        
        // Display all results
        displaySearchResults(data, promotedResults, query, startTime, page);
        
    } catch (error) {
        console.error('Search error:', error);
        // Fallback to mock results
        const mockResults = generateMockResults(query, page);
        const promotedResults = await fetchPromotedResults(query);
        displaySearchResults(mockResults, promotedResults, query, startTime, page);
    }
}

// Fetch promoted results from your JSON file
async function fetchPromotedResults(query) {
    try {
        const response = await fetch(PROMOTED_DATA_URL);
        const data = await response.json();
        
        if (!data.promoted_results) return [];
        
        const queryLower = query.toLowerCase();
        return data.promoted_results.filter(promo => {
            // Check if query matches any trigger keywords
            return promo.trigger_keywords?.some(keyword => 
                queryLower.includes(keyword.toLowerCase())
            );
        });
    } catch (error) {
        console.log('No promoted results loaded:', error);
        return [];
    }
}

// Display all search results
function displaySearchResults(data, promotedResults, query, startTime, page) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Calculate and display search time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    
    // Clear container
    resultsContainer.innerHTML = '';
    
    // Display promoted results (ads)
    if (promotedResults.length > 0) {
        displayPromotedResults(promotedResults, resultsContainer);
    }
    
    // Calculate total results count
    const organicResults = data.results || [];
    const totalDisplayedResults = organicResults.length + promotedResults.length;
    totalResults = data.number_of_results || totalDisplayedResults;
    
    if (resultsCount) {
        resultsCount.textContent = totalResults.toLocaleString();
    }
    
    // Display organic results with logos
    if (organicResults.length > 0) {
        displayOrganicResults(organicResults, resultsContainer, page);
    } else {
        showNoResultsMessage(query);
    }
    
    // Show pagination if there are multiple pages
    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    if (totalPages > 1) {
        showProfessionalPagination(page, totalPages, query);
    }
    
    // Add privacy footer
    addPrivacyFooter(query);
}

// Display promoted results with "Ad" badge
function displayPromotedResults(promotedResults, container) {
    const promotedSection = document.createElement('div');
    promotedSection.className = 'promoted-section';
    
    let promotedHTML = `
        <div class="promoted-header">
            <span class="promoted-label">Sponsored Results</span>
            <span class="promoted-info" title="These are paid promotions">ℹ️</span>
        </div>
    `;
    
    promotedResults.forEach((promo, index) => {
        const domain = extractDomain(promo.url);
        promotedHTML += `
            <div class="result-item promoted-item">
                <div class="result-badge">Ad</div>
                <div class="result-header">
                    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" 
                         alt="${domain} icon" class="result-favicon">
                    <span class="result-url">${promo.display_url || domain}</span>
                </div>
                <h3 class="result-title">
                    <a href="${promo.url}" target="_blank" rel="sponsored noopener noreferrer">
                        ${promo.title}
                    </a>
                </h3>
                <p class="result-snippet">${promo.content}</p>
                <div class="promoted-footer">
                    <span class="promoted-contact">
                        💼 Promote your site: <a href="mailto:a.tormen2012@gmail.com">Contact us</a>
                    </span>
                    <span class="promoted-bid">💰 Bid: $${promo.bid_amount || 'N/A'}</span>
                </div>
            </div>
        `;
    });
    
    promotedSection.innerHTML = promotedHTML;
    container.appendChild(promotedSection);
}

// Display organic results with logos
function displayOrganicResults(results, container, page) {
    const startRank = ((page - 1) * RESULTS_PER_PAGE) + 1;
    
    results.forEach((result, index) => {
        const rank = startRank + index;
        const resultElement = createResultElement(result, rank);
        container.appendChild(resultElement);
    });
}

// Create individual result element with logo
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = 'result-item organic-item';
    
    const domain = extractDomain(result.url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    div.innerHTML = `
        <div class="result-rank">#${rank}</div>
        <div class="result-header">
            <img src="${faviconUrl}" alt="${domain} logo" 
                 class="result-logo" onerror="this.src='assets/default-favicon.svg'">
            <div class="result-url-info">
                <span class="result-domain">${domain}</span>
                <span class="result-engine">${result.engine || 'Web'}</span>
            </div>
        </div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                ${result.title || 'No title'}
            </a>
        </h3>
        <p class="result-snippet">${result.content || result.snippet || 'No description available'}</p>
        <div class="result-meta">
            <span class="result-date">${formatRelativeTime(result.publishedDate)}</span>
            <a href="${result.url}" class="result-cache" target="_blank">Cached</a>
        </div>
    `;
    
    return div;
}

// Professional pagination like Google/Bing
function showProfessionalPagination(currentPage, totalPages, query) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 1) return;
    
    let html = '';
    const maxVisiblePages = 10;
    
    // Previous button
    if (currentPage > 1) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage - 1}" 
                     class="page-btn page-prev">‹ Previous</a>`;
    }
    
    // First page
    if (currentPage > 3) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=1" class="page-btn">1</a>`;
        if (currentPage > 4) html += `<span class="page-dots">...</span>`;
    }
    
    // Page numbers around current page
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn page-active">${i}</span>`;
        } else {
            html += `<a href="?q=${encodeURIComponent(query)}&page=${i}" class="page-btn">${i}</a>`;
        }
    }
    
    // Last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) html += `<span class="page-dots">...</span>`;
        html += `<a href="?q=${encodeURIComponent(query)}&page=${totalPages}" 
                    class="page-btn">${totalPages}</a>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage + 1}" 
                     class="page-btn page-next">Next ›</a>`;
    }
    
    // Page selector dropdown
    if (totalPages > 5) {
        html += `
            <div class="page-selector">
                <span>Go to page:</span>
                <select onchange="goToPage(this.value, '${encodeURIComponent(query)}')">
                    ${Array.from({length: Math.min(totalPages, 50)}, (_, i) => i + 1)
                        .map(p => `<option value="${p}" ${p === currentPage ? 'selected' : ''}>${p}</option>`)
                        .join('')}
                </select>
            </div>
        `;
    }
    
    pagination.innerHTML = html;
}

// Page navigation function
function goToPage(page, query) {
    window.location.href = `?q=${query}&page=${page}`;
}

// Update URL without reload
function updateURL(query, page) {
    const newURL = `${window.location.pathname}?q=${encodeURIComponent(query)}&page=${page}`;
    window.history.pushState({ query, page }, '', newURL);
}

// Show loading animation
function showLoadingAnimation(query, page, container) {
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-logo">🔍</div>
            <div class="loading-text">
                <h3>Searching for "${query}"</h3>
                <p>Page ${page} • Fetching private, non-tracked results...</p>
            </div>
            <div class="loading-progress">
                <div class="loading-bar"></div>
            </div>
            <div class="loading-stats">
                <div class="stat">
                    <div class="stat-value">0</div>
                    <div class="stat-label">results</div>
                </div>
                <div class="stat">
                    <div class="stat-value">0.00s</div>
                    <div class="stat-label">time</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${page}</div>
                    <div class="stat-label">page</div>
                </div>
            </div>
        </div>
    `;
}

// No results message
function showNoResultsMessage(query) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>No results found for "${query}"</h3>
            <p>Try adjusting your search or check out these alternatives:</p>
            <div class="alternative-searches">
                <a href="?q=${encodeURIComponent(query + ' tutorial')}" class="alt-search">${query} tutorial</a>
                <a href="?q=${encodeURIComponent(query + ' guide')}" class="alt-search">${query} guide</a>
                <a href="?q=${encodeURIComponent('how to ' + query)}" class="alt-search">how to ${query}</a>
            </div>
        </div>
    `;
}

// Add privacy footer
function addPrivacyFooter(query) {
    const container = document.getElementById('resultsContainer');
    const footer = document.createElement('div');
    footer.className = 'privacy-footer';
    footer.innerHTML = `
        <div class="privacy-banner">
            <span class="privacy-icon">🔒</span>
            <div class="privacy-text">
                <strong>Private Search Guaranteed</strong>
                <p>Your search for "${query}" was not tracked, logged, or stored.</p>
                <a href="https://ymal.space/privacy-policy.html">Read our privacy policy →</a>
            </div>
        </div>
    `;
    container.appendChild(footer);
}

// Utility: Extract domain from URL
function extractDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'unknown-source';
    }
}

// Utility: Format relative time
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
}

// Setup dark mode
function setupDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;
    
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('ymalDarkMode', document.body.classList.contains('dark-mode'));
    });
    
    if (localStorage.getItem('ymalDarkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// Setup search suggestions
function setupSearchSuggestions() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    
    // Add instant search on typing
    input.addEventListener('input', debounce(function(e) {
        const query = this.value.trim();
        if (query.length > 2) {
            // Could fetch suggestions here
            console.log('Suggestion for:', query);
        }
    }, 300));
}

// Setup quick search tips
function setupQuickSearch() {
    const tips = document.querySelectorAll('.tip');
    tips.forEach(tip => {
        tip.addEventListener('click', function() {
            const query = this.textContent.replace('!', '');
            document.getElementById('searchInput').value = query;
            document.getElementById('searchForm').submit();
        });
    });
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate mock results for fallback
function generateMockResults(query, page = 1) {
    const mockData = [
        {
            title: `Wikipedia: ${query}`,
            content: `Learn about ${query} on Wikipedia, the free encyclopedia. Find comprehensive information and references.`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            engine: 'Wikipedia'
        },
        {
            title: `${query} Tutorial - YouTube`,
            content: `Watch step-by-step tutorials about ${query}. Learn from experts with practical examples and demonstrations.`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+tutorial`,
            engine: 'YouTube'
        },
        {
            title: `${query} on Reddit`,
            content: `Join the discussion about ${query} on Reddit. See what the community is saying and share your thoughts.`,
            url: `https://www.reddit.com/search?q=${encodeURIComponent(query)}`,
            engine: 'Reddit'
        },
        {
            title: `GitHub Projects: ${query}`,
            content: `Find open-source projects related to ${query} on GitHub. Browse code repositories and contribute.`,
            url: `https://github.com/search?q=${encodeURIComponent(query)}`,
            engine: 'GitHub'
        },
        {
            title: `${query} Documentation`,
            content: `Official documentation and API references for ${query}. Find detailed guides and examples.`,
            url: `https://devdocs.io/?q=${encodeURIComponent(query)}`,
            engine: 'DevDocs'
        }
    ];
    
    // Simulate pagination
    const start = (page - 1) * RESULTS_PER_PAGE;
    const paginatedResults = mockData.slice(start, start + RESULTS_PER_PAGE);
    
    return {
        results: paginatedResults,
        number_of_results: mockData.length * 3, // Simulate more results
        query_time: 0.45
    };
}

// Initialize pagination for back/forward buttons
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.query) {
        currentQuery = event.state.query;
        currentPage = event.state.page || 1;
        performSearch(currentQuery, currentPage);
    }
});
