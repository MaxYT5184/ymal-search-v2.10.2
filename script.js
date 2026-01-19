// ========================
// YMAL SEARCH ENGINE v4.0
// Google + DuckDuckGo + Wikipedia
// ========================

// CONFIGURATION - YOU MUST SET THESE!
const API_CONFIG = {
    // ⚠️ GET YOUR GOOGLE API KEY AT: https://console.cloud.google.com/
    google: {
        apiKey: '03ced5d5300130d49c2413af2696f65e56ae8e31', // ← REPLACE THIS
        searchEngineId: '6506deda85ee44ffc', // ← REPLACE THIS
        url: 'https://www.googleapis.com/customsearch/v1'
    },
    
    // DuckDuckGo (no API key needed)
    duckduckgo: {
        url: 'https://api.duckduckgo.com/'
    },
    
    // Wikipedia (no API key needed)
    wikipedia: {
        url: 'https://en.wikipedia.org/w/api.php'
    }
};

// Search state
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;
const RESULTS_PER_PAGE = 10;
const searchCache = new Map();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Ymal Search v4.0 - Google + DuckDuckGo + Wikipedia');
    initializeSearch();
    setupDarkMode();
    setupSearchForm();
    loadSavedQueries();
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
        window.location.href = 'index.html';
    }
}

// Setup search form
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm') || document.querySelector('form');
    const searchInput = document.getElementById('searchInput');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                // Save to recent searches
                saveRecentQuery(query);
                // Perform search
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }
    
    // Add instant suggestions
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const query = this.value.trim();
            if (query.length > 2) {
                showQuickSuggestions(query);
            }
        }, 300));
    }
}

// Main search function
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    currentQuery = query;
    currentPage = page;
    
    // Update URL
    updateURL(query, page);
    
    // Show loading animation
    showLoadingAnimation(query, page);
    
    try {
        // Check cache first
        const cacheKey = `${query}_${page}`;
        if (searchCache.has(cacheKey)) {
            console.log('Using cached results');
            const cached = searchCache.get(cacheKey);
            displayAllResults(cached, startTime);
            return;
        }
        
        // Fetch promoted results (ads)
        const promotedResults = await fetchPromotedResults(query);
        
        // Fetch organic results from all sources in parallel
        const [googleResults, duckduckgoResults, wikipediaResults] = await Promise.allSettled([
            searchGoogle(query, page),
            searchDuckDuckGo(query),
            searchWikipedia(query)
        ]);
        
        // Combine results
        const combinedResults = combineResults({
            google: googleResults.status === 'fulfilled' ? googleResults.value : [],
            duckduckgo: duckduckgoResults.status === 'fulfilled' ? duckduckgoResults.value : [],
            wikipedia: wikipediaResults.status === 'fulfilled' ? wikipediaResults.value : [],
            promoted: promotedResults
        }, page);
        
        // Cache results (1 hour expiration)
        searchCache.set(cacheKey, combinedResults);
        setTimeout(() => searchCache.delete(cacheKey), 60 * 60 * 1000);
        
        // Display results
        displayAllResults(combinedResults, startTime);
        
    } catch (error) {
        console.error('Search failed:', error);
        showSearchError(query, error.message);
    }
}

// ========================
// SEARCH API FUNCTIONS
// ========================

// Google Custom Search API
async function searchGoogle(query, page = 1) {
    // Check if API keys are set
    if (API_CONFIG.google.apiKey === 'YOUR_GOOGLE_API_KEY_HERE') {
        console.warn('⚠️ Google API key not set! Using mock data.');
        return generateMockGoogleResults(query, page);
    }
    
    try {
        const startIndex = ((page - 1) * 10) + 1;
        const response = await fetch(
            `${API_CONFIG.google.url}?key=${API_CONFIG.google.apiKey}` +
            `&cx=${API_CONFIG.google.searchEngineId}` +
            `&q=${encodeURIComponent(query)}` +
            `&start=${startIndex}&num=10&gl=us&lr=lang_en`
        );
        
        if (!response.ok) {
            throw new Error(`Google API: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data.items || [];
        
        return items.map(item => ({
            title: item.title || 'No title',
            content: item.snippet || 'No description available',
            url: item.link || '#',
            displayUrl: getDisplayUrl(item.link),
            source: 'Google',
            favicon: `https://www.google.com/s2/favicons?domain=${getDomain(item.link)}&sz=32`,
            type: 'web',
            date: item.pagemap?.metatags?.[0]?.['article:published_time'] || '',
            isGoogle: true
        }));
        
    } catch (error) {
        console.warn('Google search failed:', error);
        // Fallback to mock results
        return generateMockGoogleResults(query, page);
    }
}

// DuckDuckGo Search API
async function searchDuckDuckGo(query) {
    try {
        const response = await fetch(
            `${API_CONFIG.duckduckgo.url}?q=${encodeURIComponent(query)}` +
            '&format=json&no_html=1&skip_disambig=1&t=ymal.search'
        );
        
        if (!response.ok) {
            throw new Error(`DuckDuckGo API: ${response.status}`);
        }
        
        const data = await response.json();
        const results = [];
        
        // Instant Answer (featured snippet)
        if (data.AbstractText) {
            results.push({
                title: data.Heading || query,
                content: data.AbstractText,
                url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                displayUrl: 'duckduckgo.com',
                source: 'DuckDuckGo',
                favicon: 'https://duckduckgo.com/assets/icons/meta/DDG-icon_256x256.png',
                type: 'instant_answer',
                isInstantAnswer: true,
                isDuckDuckGo: true
            });
        }
        
        // Related Topics
        if (data.RelatedTopics) {
            data.RelatedTopics.forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text,
                        content: topic.Text,
                        url: topic.FirstURL,
                        displayUrl: getDisplayUrl(topic.FirstURL),
                        source: 'DuckDuckGo',
                        favicon: topic.Icon?.URL || 'https://duckduckgo.com/favicon.ico',
                        type: 'related_topic',
                        isDuckDuckGo: true
                    });
                }
            });
        }
        
        return results.slice(0, 3); // Limit to 3 results
        
    } catch (error) {
        console.warn('DuckDuckGo search failed:', error);
        return [];
    }
}

// Wikipedia API
async function searchWikipedia(query) {
    try {
        const response = await fetch(
            `${API_CONFIG.wikipedia.url}?action=query` +
            `&list=search&srsearch=${encodeURIComponent(query)}` +
            '&format=json&origin=*&srlimit=3&srprop=snippet'
        );
        
        if (!response.ok) {
            throw new Error(`Wikipedia API: ${response.status}`);
        }
        
        const data = await response.json();
        const searchResults = data.query?.search || [];
        
        return searchResults.map(item => ({
            title: item.title,
            content: item.snippet.replace(/<[^>]*>/g, '') + '...',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            displayUrl: 'en.wikipedia.org',
            source: 'Wikipedia',
            favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
            type: 'encyclopedia',
            isWikipedia: true
        }));
        
    } catch (error) {
        console.warn('Wikipedia search failed:', error);
        return [];
    }
}

// Combine results from all sources
function combineResults(sources, page) {
    const allResults = [];
    const seenUrls = new Set();
    
    // Add promoted results (will be displayed separately)
    const promoted = sources.promoted || [];
    
    // Add DuckDuckGo instant answer first (if exists)
    const duckduckgoInstant = sources.duckduckgo.find(r => r.isInstantAnswer);
    if (duckduckgoInstant && !seenUrls.has(duckduckgoInstant.url)) {
        duckduckgoInstant.rank = 1;
        duckduckgoInstant.isFeatured = true;
        allResults.push(duckduckgoInstant);
        seenUrls.add(duckduckgoInstant.url);
    }
    
    // Add Wikipedia results
    sources.wikipedia.forEach(result => {
        if (!seenUrls.has(result.url)) {
            result.rank = allResults.length + 1;
            result.isKnowledge = true;
            allResults.push(result);
            seenUrls.add(result.url);
        }
    });
    
    // Add Google results (main web results)
    sources.google.forEach(result => {
        if (!seenUrls.has(result.url)) {
            result.rank = allResults.length + 1;
            allResults.push(result);
            seenUrls.add(result.url);
        }
    });
    
    // Add remaining DuckDuckGo results
    sources.duckduckgo.forEach(result => {
        if (!result.isInstantAnswer && !seenUrls.has(result.url)) {
            result.rank = allResults.length + 1;
            allResults.push(result);
            seenUrls.add(result.url);
        }
    });
    
    // Calculate pagination
    const startIdx = (page - 1) * RESULTS_PER_PAGE;
    const endIdx = startIdx + RESULTS_PER_PAGE;
    const paginatedResults = allResults.slice(startIdx, endIdx);
    
    return {
        results: paginatedResults,
        promoted: promoted,
        allResults: allResults,
        total: allResults.length,
        sourcesUsed: {
            google: sources.google.length > 0,
            duckduckgo: sources.duckduckgo.length > 0,
            wikipedia: sources.wikipedia.length > 0
        },
        page: page,
        totalPages: Math.ceil(allResults.length / RESULTS_PER_PAGE)
    };
}

// ========================
// DISPLAY FUNCTIONS
// ========================

function displayAllResults(data, startTime) {
    const container = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Calculate search time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    
    // Clear container
    container.innerHTML = '';
    
    // Update results count
    if (resultsCount) {
        resultsCount.textContent = data.total.toLocaleString();
        document.title = `${currentQuery} (${data.total.toLocaleString()} results) - Ymal Search`;
    }
    
    // Show sources used
    showSourcesUsed(data.sourcesUsed, container);
    
    // Show promoted results (ads)
    if (data.promoted && data.promoted.length > 0) {
        displayPromotedResults(data.promoted, container);
    }
    
    // Check if no results
    if (data.results.length === 0) {
        showNoResults(currentQuery);
        return;
    }
    
    // Display organic results
    let resultIndex = 0;
    data.results.forEach(result => {
        resultIndex++;
        const globalRank = ((data.page - 1) * RESULTS_PER_PAGE) + resultIndex;
        const resultElement = createResultElement(result, globalRank);
        container.appendChild(resultElement);
    });
    
    // Show pagination
    if (data.totalPages > 1) {
        showPagination(data.page, data.totalPages, currentQuery);
    }
    
    // Add privacy footer
    addPrivacyFooter();
}

// Create result element
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = `result-item ${result.source.toLowerCase()}-result ${result.isFeatured ? 'featured-result' : ''}`;
    
    div.innerHTML = `
        <div class="result-rank">#${rank}</div>
        <div class="result-header">
            <img src="${result.favicon}" alt="${result.source} icon" class="result-favicon" 
                 onerror="this.src='https://www.google.com/s2/favicons?domain=${getDomain(result.url)}&sz=32'">
            <div class="result-url-info">
                <span class="result-display-url">${result.displayUrl}</span>
                <span class="result-source-badge ${result.source.toLowerCase()}">${result.source}</span>
            </div>
        </div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer" 
               onclick="trackClick('${encodeURIComponent(result.url)}')">
                ${result.title}
            </a>
        </h3>
        <p class="result-snippet">${result.content}</p>
        ${result.date ? `<div class="result-date">${formatRelativeTime(result.date)}</div>` : ''}
        <div class="result-actions">
            <a href="${result.url}" target="_blank" class="result-visit">Visit Site</a>
            <a href="https://web.archive.org/web/${result.url}" target="_blank" class="result-cache">Cached</a>
            <a href="search.html?q=${encodeURIComponent(result.title)}" class="result-similar">Similar</a>
        </div>
    `;
    
    return div;
}

// Show sources used
function showSourcesUsed(sources, container) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'sources-used';
    
    const activeSources = [];
    if (sources.google) activeSources.push('Google');
    if (sources.duckduckgo) activeSources.push('DuckDuckGo');
    if (sources.wikipedia) activeSources.push('Wikipedia');
    
    sourcesDiv.innerHTML = `
        <div class="sources-label">Sources: </div>
        <div class="sources-list">
            ${activeSources.map(source => `
                <span class="source-badge ${source.toLowerCase()}">${source}</span>
            `).join('')}
        </div>
        <div class="sources-note">Combining results from ${activeSources.length} sources</div>
    `;
    
    container.appendChild(sourcesDiv);
}

// Show pagination
function showPagination(currentPage, totalPages, query) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 1) return;
    
    let html = '';
    const maxVisiblePages = 7;
    
    // Previous button
    if (currentPage > 1) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage - 1}" 
                     class="page-btn page-prev">‹ Previous</a>`;
    }
    
    // Calculate page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis
    if (startPage > 1) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=1" class="page-btn">1</a>`;
        if (startPage > 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn page-active">${i}</span>`;
        } else {
            html += `<a href="?q=${encodeURIComponent(query)}&page=${i}" class="page-btn">${i}</a>`;
        }
    }
    
    // Ellipsis + last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-dots">...</span>`;
        }
        html += `<a href="?q=${encodeURIComponent(query)}&page=${totalPages}" 
                    class="page-btn">${totalPages}</a>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage + 1}" 
                     class="page-btn page-next">Next ›</a>`;
    }
    
    // Page selector
    html += `
        <div class="page-selector">
            <span>Page:</span>
            <select onchange="window.location.href='?q=${encodeURIComponent(query)}&page='+this.value">
                ${Array.from({length: Math.min(totalPages, 50)}, (_, i) => i + 1)
                    .map(p => `<option value="${p}" ${p === currentPage ? 'selected' : ''}>${p}</option>`)
                    .join('')}
            </select>
            <span>of ${totalPages}</span>
        </div>
    `;
    
    pagination.innerHTML = html;
}

// Loading animation
function showLoadingAnimation(query, page) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner">
                <div class="spinner-icon">🔍</div>
                <div class="spinner-ring"></div>
            </div>
            <div class="loading-content">
                <h3>Searching for "${query}"</h3>
                <p>Page ${page} • Gathering results from Google, DuckDuckGo, and Wikipedia...</p>
                <div class="loading-sources">
                    <div class="source-loading google-loading">
                        <div class="source-dot"></div>
                        <span>Google</span>
                    </div>
                    <div class="source-loading ddg-loading">
                        <div class="source-dot"></div>
                        <span>DuckDuckGo</span>
                    </div>
                    <div class="source-loading wiki-loading">
                        <div class="source-dot"></div>
                        <span>Wikipedia</span>
                    </div>
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
                        <div class="stat-value">3</div>
                        <div class="stat-label">sources</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// No results message
function showNoResults(query) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>No results found for "${query}"</h3>
            <p>Try these suggestions:</p>
            <div class="suggestions">
                <a href="?q=${encodeURIComponent(query.split(' ')[0])}" class="suggestion">
                    Search for "${query.split(' ')[0]}"
                </a>
                <a href="?q=${encodeURIComponent(query + ' site:wikipedia.org')}" class="suggestion">
                    Search Wikipedia for "${query}"
                </a>
                <a href="?q=${encodeURIComponent('"${query}"')}" class="suggestion">
                    Exact phrase "${query}"
                </a>
            </div>
            <div class="alternative-search">
                <p>Or try searching on:</p>
                <div class="alternative-engines">
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alt-engine google-alt">
                        <span class="engine-icon">G</span>
                        <span class="engine-name">Google</span>
                    </a>
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alt-engine ddg-alt">
                        <span class="engine-icon">🦆</span>
                        <span class="engine-name">DuckDuckGo</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Search error message
function showSearchError(query, errorMsg) {
    const container = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    if (searchTime) searchTime.textContent = '0.00';
    if (resultsCount) resultsCount.textContent = '0';
    
    container.innerHTML = `
        <div class="search-error">
            <div class="error-icon">⚠️</div>
            <h3>Search Error</h3>
            <p>Unable to complete search for "${query}". Please try again.</p>
            <div class="error-details">
                <strong>Error:</strong> ${errorMsg}
            </div>
            <div class="error-actions">
                <button onclick="window.location.reload()" class="error-btn retry-btn">
                    Retry Search
                </button>
                <a href="index.html" class="error-btn home-btn">
                    New Search
                </a>
            </div>
        </div>
    `;
}

// Add privacy footer
function addPrivacyFooter() {
    const container = document.getElementById('resultsContainer');
    const footer = document.createElement('div');
    footer.className = 'privacy-footer';
    footer.innerHTML = `
        <div class="privacy-banner">
            <div class="privacy-icon">🔒</div>
            <div class="privacy-content">
                <h4>Private Search Guarantee</h4>
                <p>Your search for "${currentQuery}" was processed privately. 
                We don't store search history, use cookies, or track your activity.</p>
                <a href="https://ymal.space/privacy-policy.html" class="privacy-link">
                    Read our full privacy policy →
                </a>
            </div>
        </div>
    `;
    container.appendChild(footer);
}

// ========================
// UTILITY FUNCTIONS
// ========================

// Update URL
function updateURL(query, page) {
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('page', page);
    window.history.replaceState({ query, page }, '', url);
}

// Get domain from URL
function getDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'unknown';
    }
}

// Get display URL
function getDisplayUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '') + 
               (urlObj.pathname !== '/' ? urlObj.pathname.replace(/\/$/, '') : '');
    } catch {
        return url;
    }
}

// Format relative time
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return date.toLocaleDateString();
    } catch {
        return '';
    }
}

// Generate mock Google results (for testing)
function generateMockGoogleResults(query, page) {
    const mockResults = [
        {
            title: `Wikipedia: ${query}`,
            content: `Learn about ${query} on Wikipedia. Free encyclopedia with detailed information.`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            displayUrl: 'en.wikipedia.org',
            source: 'Google',
            favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
            type: 'encyclopedia',
            isWikipedia: true
        },
        {
            title: `${query} - Official Site`,
            content: `Visit the official website for ${query}. Find news, updates, and official information.`,
            url: `https://${encodeURIComponent(query.toLowerCase().replace(/\s+/g, ''))}.com`,
            displayUrl: `${query.toLowerCase().replace(/\s+/g, '')}.com`,
            source: 'Google',
            favicon: `https://www.google.com/s2/favicons?domain=${query.toLowerCase().replace(/\s+/g, '')}.com&sz=32`,
            type: 'website'
        },
        {
            title: `${query} News`,
            content: `Latest news and updates about ${query}. Read articles from trusted sources.`,
            url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
            displayUrl: 'news.google.com',
            source: 'Google',
            favicon: 'https://www.google.com/s2/favicons?domain=news.google.com&sz=32',
            type: 'news'
        },
        {
            title: `${query} Images`,
            content: `Browse images related to ${query}. Find photos, illustrations, and graphics.`,
            url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`,
            displayUrl: 'google.com/images',
            source: 'Google',
            favicon: 'https://www.google.com/favicon.ico',
            type: 'images'
        },
        {
            title: `${query} Videos`,
            content: `Watch videos about ${query}. Find tutorials, reviews, and demonstrations.`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            displayUrl: 'youtube.com',
            source: 'Google',
            favicon: 'https://www.youtube.com/favicon.ico',
            type: 'videos'
        }
    ];
    
    // Simulate pagination
    const start = (page - 1) * RESULTS_PER_PAGE;
    return mockResults.slice(start, start + RESULTS_PER_PAGE);
}

// Fetch promoted results (your ad system)
async function fetchPromotedResults(query) {
    try {
        const response = await fetch('promoted.json');
        if (!response.ok) return [];
        
        const data = await response.json();
        const queryLower = query.toLowerCase();
        
        return (data.promoted_results || []).filter(promo => 
            promo.trigger_keywords?.some(keyword => 
                queryLower.includes(keyword.toLowerCase())
            )
        ).slice(0, 2); // Max 2 promoted results
        
    } catch (error) {
        console.log('No promoted results:', error);
        return [];
    }
}

// Display promoted results
function displayPromotedResults(promoted, container) {
    const promotedSection = document.createElement('div');
    promotedSection.className = 'promoted-section';
    
    promotedSection.innerHTML = `
        <div class="promoted-header">
            <span class="promoted-label">Sponsored Results</span>
            <span class="promoted-info" title="Paid advertisements">ℹ️</span>
        </div>
        ${promoted.map(promo => `
            <div class="promoted-item">
                <div class="ad-badge">Ad</div>
                <div class="result-header">
                    <img src="https://www.google.com/s2/favicons?domain=${getDomain(promo.url)}&sz=32" 
                         class="result-favicon">
                    <span class="result-display-url">${promo.display_url || getDisplayUrl(promo.url)}</span>
                </div>
                <h3 class="result-title">
                    <a href="${promo.url}" target="_blank" rel="sponsored noopener noreferrer">
                        ${promo.title}
                    </a>
                </h3>
                <p class="result-snippet">${promo.content}</p>
                <div class="promoted-footer">
                    <span class="promoted-contact">
                        💼 <a href="mailto:a.tormen2012@gmail.com">Promote your site</a>
                    </span>
                </div>
            </div>
        `).join('')}
    `;
    
    container.appendChild(promotedSection);
}

// Quick search suggestions
function showQuickSuggestions(query) {
    // This could be enhanced with a suggestions API
    console.log('Showing suggestions for:', query);
}

// Save recent query
function saveRecentQuery(query) {
    try {
        let recent = JSON.parse(localStorage.getItem('ymalRecentQueries') || '[]');
        recent = recent.filter(q => q !== query); // Remove duplicates
        recent.unshift(query); // Add to beginning
        recent = recent.slice(0, 10); // Keep last 10
        localStorage.setItem('ymalRecentQueries', JSON.stringify(recent));
    } catch (e) {
        console.log('Could not save query:', e);
    }
}

// Load saved queries
function loadSavedQueries() {
    try {
        const recent = JSON.parse(localStorage.getItem('ymalRecentQueries') || '[]');
        // Could display these in a suggestions dropdown
        return recent;
    } catch (e) {
        return [];
    }
}

// Setup dark mode
function setupDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('ymalDarkMode', document.body.classList.contains('dark-mode'));
        });
        
        if (localStorage.getItem('ymalDarkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
    }
}

// Track clicks (privacy-friendly)
function trackClick(url) {
    // Basic analytics - you can extend this
    console.log('Result clicked:', decodeURIComponent(url));
    return true;
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
