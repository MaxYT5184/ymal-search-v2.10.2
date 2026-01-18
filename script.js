// YMAL SEARCH ENGINE - COMPLETE WORKING VERSION
const SEARCH_PROXY_URL = 'https://ymal-search-proxy.a-tormen2012.workers.dev';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    setupDarkMode();
    setupSearchSuggestions();
});

// Initialize search from URL
function initializeSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const page = urlParams.get('page') || '1';
    
    // Set search input value
    const searchInput = document.getElementById('searchInput');
    if (searchInput && query) {
        searchInput.value = query;
        document.title = `${query} - Ymal Search`;
    }
    
    // Set results page search input value
    const resultsSearchInput = document.getElementById('resultsSearchInput');
    if (resultsSearchInput && query) {
        resultsSearchInput.value = query;
    }
    
    // Perform search if query exists
    if (query && query.trim()) {
        performSearch(query, parseInt(page));
    }
}

// Main search function
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Show loading animation
    showLoadingAnimation(query, resultsContainer);
    
    try {
        // Call Cloudflare Worker
        const response = await fetch(`${SEARCH_PROXY_URL}/?q=${encodeURIComponent(query)}&page=${page}`, {
            headers: {
                'Accept': 'application/json',
                'X-Ymal-Search': 'v1.0'
            },
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Search failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display results
        displaySearchResults(data, query, startTime, page);
        
        // Show fallback notice if needed
        if (data.fallback) {
            showFallbackNotice(data.message);
        }
        
    } catch (error) {
        console.error('Search error:', error);
        
        // Show error with retry option
        showSearchError(query, error.message, startTime);
    }
}

// Show loading animation
function showLoadingAnimation(query, container) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spin">🔍</div>
            <h3 class="loading-title">Searching Ymal for "${query}"</h3>
            <p class="loading-subtitle">Fetching private, non-tracked results...</p>
            <div class="loading-progress">
                <div class="loading-bar"></div>
            </div>
            <p class="loading-privacy">
                <strong>🔒 Privacy Protected:</strong> Your search is not tracked or logged
            </p>
        </div>
        <style>
            .loading-container {
                text-align: center;
                padding: 50px 20px;
            }
            .loading-spin {
                font-size: 3.5rem;
                margin-bottom: 20px;
                animation: spin 2s linear infinite;
            }
            .loading-title {
                color: var(--text-dark);
                margin-bottom: 10px;
            }
            .loading-subtitle {
                color: var(--text-light);
                margin-bottom: 30px;
            }
            .loading-progress {
                width: 300px;
                height: 6px;
                background: var(--light-blue);
                border-radius: 3px;
                margin: 0 auto 20px;
                overflow: hidden;
            }
            .loading-bar {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-blue), var(--primary-red));
                animation: loading 2s ease-in-out infinite;
            }
            .loading-privacy {
                color: var(--primary-blue);
                font-size: 0.9rem;
                margin-top: 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
            }
        </style>
    `;
}

// Display search results
function displaySearchResults(data, query, startTime, currentPage) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Calculate search time
    const elapsedTime = (Date.now() - startTime) / 1000;
    
    // Update stats
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    if (resultsCount) {
        const count = data.number_of_results || data.results?.length || 0;
        resultsCount.textContent = count.toLocaleString();
    }
    
    // Clear container
    resultsContainer.innerHTML = '';
    
    // Check if no results
    if (!data.results || data.results.length === 0) {
        showNoResultsMessage(query);
        return;
    }
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'search-success';
    successMsg.innerHTML = `
        <div class="success-banner">
            <div class="success-icon">✅</div>
            <div class="success-content">
                <h4>Found ${data.results.length} results for "${query}"</h4>
                ${data.instance_used ? `<p>Served via ${new URL(data.instance_used).hostname}</p>` : ''}
            </div>
        </div>
    `;
    resultsContainer.appendChild(successMsg);
    
    // Add CSS for success banner
    const successStyle = document.createElement('style');
    successStyle.textContent = `
        .success-banner {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-red));
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            animation: slideDown 0.5s ease-out;
        }
        .success-icon {
            font-size: 2rem;
            flex-shrink: 0;
        }
        .success-content h4 {
            margin: 0 0 5px 0;
            font-size: 1.1rem;
        }
        .success-content p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(successStyle);
    
    // Display each result with staggered animation
    data.results.forEach((result, index) => {
        setTimeout(() => {
            const resultElement = createResultElement(result, index + 1);
            resultsContainer.appendChild(resultElement);
        }, index * 50); // Stagger animations
    });
    
    // Add pagination if needed
    if (data.number_of_results > 10) {
        setTimeout(() => {
            showPagination(currentPage, Math.ceil(data.number_of_results / 10), query);
        }, data.results.length * 50 + 100);
    }
    
    // Add privacy footer
    setTimeout(() => {
        const privacyFooter = document.createElement('div');
        privacyFooter.className = 'privacy-footer';
        privacyFooter.innerHTML = `
            <div class="privacy-banner">
                <div class="privacy-icon">🔒</div>
                <div class="privacy-content">
                    <h5>Search Privacy Guaranteed</h5>
                    <p>Your search for "${query}" was not tracked, logged, or stored.</p>
                    <a href="https://ymal.space/privacy-policy.html" class="privacy-link">
                        Read our Privacy Policy →
                    </a>
                </div>
            </div>
        `;
        resultsContainer.appendChild(privacyFooter);
        
        // Add privacy banner CSS
        const privacyStyle = document.createElement('style');
        privacyStyle.textContent = `
            .privacy-banner {
                background: var(--light-blue);
                padding: 25px;
                border-radius: 12px;
                margin-top: 40px;
                display: flex;
                align-items: center;
                gap: 20px;
                border-left: 4px solid var(--primary-blue);
            }
            .privacy-icon {
                font-size: 2.5rem;
                flex-shrink: 0;
            }
            .privacy-content h5 {
                margin: 0 0 8px 0;
                color: var(--text-dark);
                font-size: 1.1rem;
            }
            .privacy-content p {
                margin: 0 0 12px 0;
                color: var(--text-light);
                font-size: 0.95rem;
            }
            .privacy-link {
                color: var(--primary-blue);
                text-decoration: none;
                font-weight: 600;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .privacy-link:hover {
                color: var(--dark-blue);
                text-decoration: underline;
            }
        `;
        document.head.appendChild(privacyStyle);
    }, data.results.length * 50 + 200);
}

// Create a result element
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = 'result-item animated-result';
    div.style.setProperty('--delay', `${rank * 0.05}s`);
    
    // Format URL for display
    let displayUrl = result.url || '';
    let cleanUrl = '';
    try {
        const urlObj = new URL(displayUrl);
        cleanUrl = urlObj.hostname.replace('www.', '');
        displayUrl = cleanUrl.length > 30 ? cleanUrl.substring(0, 30) + '...' : cleanUrl;
    } catch (e) {
        displayUrl = 'Unknown source';
    }
    
    // Format title and content
    const title = result.title || 'No title';
    let content = result.content || result.description || 'No description available';
    
    // Truncate content if too long
    if (content.length > 250) {
        content = content.substring(0, 250) + '...';
    }
    
    // Calculate score percentage
    const scorePercent = result.score ? Math.round(result.score * 100) : 75;
    const scoreColor = scorePercent >= 90 ? '#10b981' : 
                      scorePercent >= 70 ? '#3b82f6' : 
                      scorePercent >= 50 ? '#f59e0b' : '#ef4444';
    
    div.innerHTML = `
        <div class="result-header">
            <div class="result-url">${displayUrl}</div>
            <div class="result-rank">#${rank}</div>
        </div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer" 
               class="result-link" onclick="trackResultClick('${encodeURIComponent(result.url)}', '${encodeURIComponent(title)}')">
                ${title}
            </a>
        </h3>
        <div class="result-snippet">${content}</div>
        <div class="result-footer">
            ${result.engine ? `<span class="result-engine">${result.engine}</span>` : ''}
            <div class="result-score" style="--score: ${scorePercent}%; --color: ${scoreColor};">
                <div class="score-bar"></div>
                <span class="score-text">Relevance: ${scorePercent}%</span>
            </div>
        </div>
    `;
    
    return div;
}

// Show fallback notice
function showFallbackNotice(message) {
    const notice = document.createElement('div');
    notice.className = 'fallback-notice';
    notice.innerHTML = `
        <div class="fallback-banner">
            <div class="fallback-icon">⚠️</div>
            <div class="fallback-content">
                <strong>${message || 'Enhanced results mode'}</strong>
                <p>Real-time search optimization in progress</p>
            </div>
        </div>
    `;
    
    const container = document.getElementById('resultsContainer');
    if (container && container.firstChild) {
        container.insertBefore(notice, container.firstChild);
    }
    
    // Add fallback CSS
    const fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = `
        .fallback-banner {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            animation: fadeIn 0.5s ease-out;
        }
        .fallback-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }
        .fallback-content strong {
            display: block;
            margin-bottom: 4px;
            font-size: 1rem;
        }
        .fallback-content p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(fallbackStyle);
}

// Show no results message
function showNoResultsMessage(query) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    resultsContainer.innerHTML = `
        <div class="no-results-container">
            <div class="no-results-icon">🔍</div>
            <h3 class="no-results-title">No results found for "${query}"</h3>
            <p class="no-results-subtitle">Try these suggestions or refine your search:</p>
            
            <div class="suggestions-grid">
                <a href="?q=${encodeURIComponent(query.split(' ')[0])}" class="suggestion-card">
                    <div class="suggestion-icon">🔎</div>
                    <div class="suggestion-text">"${query.split(' ')[0]}"</div>
                </a>
                <a href="?q=${encodeURIComponent(query + ' guide')}" class="suggestion-card">
                    <div class="suggestion-icon">📖</div>
                    <div class="suggestion-text">"${query} guide"</div>
                </a>
                <a href="?q=${encodeURIComponent(query + ' tutorial')}" class="suggestion-card">
                    <div class="suggestion-icon">🎬</div>
                    <div class="suggestion-text">"${query} tutorial"</div>
                </a>
                <a href="?q=${encodeURIComponent('how to ' + query)}" class="suggestion-card">
                    <div class="suggestion-icon">❓</div>
                    <div class="suggestion-text">"how to ${query}"</div>
                </a>
            </div>
            
            <div class="alternative-search">
                <h4 class="alternative-title">Try searching on:</h4>
                <div class="alternative-buttons">
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alternative-btn duckduckgo">
                        <span class="btn-icon">🦆</span>
                        <span class="btn-text">DuckDuckGo</span>
                    </a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alternative-btn google">
                        <span class="btn-icon">G</span>
                        <span class="btn-text">Google</span>
                    </a>
                    <a href="https://www.bing.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alternative-btn bing">
                        <span class="btn-icon">B</span>
                        <span class="btn-text">Bing</span>
                    </a>
                </div>
            </div>
            
            <div class="back-search">
                <a href="index.html" class="back-btn">
                    <span class="back-icon">←</span>
                    <span class="back-text">Back to Search</span>
                </a>
            </div>
        </div>
    `;
    
    // Add no results CSS
    const noResultsStyle = document.createElement('style');
    noResultsStyle.textContent = `
        .no-results-container {
            text-align: center;
            padding: 40px 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .no-results-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.7;
        }
        .no-results-title {
            color: var(--text-dark);
            margin-bottom: 10px;
        }
        .no-results-subtitle {
            color: var(--text-light);
            margin-bottom: 30px;
        }
        .suggestions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }
        .suggestion-card {
            background: var(--white);
            border: 2px solid var(--light-blue);
            border-radius: 12px;
            padding: 20px;
            text-decoration: none;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .suggestion-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary-blue);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .suggestion-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        .suggestion-text {
            color: var(--text-dark);
            font-weight: 600;
            font-size: 0.95rem;
        }
        .alternative-search {
            background: var(--light-blue);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .alternative-title {
            margin-bottom: 20px;
            color: var(--text-dark);
        }
        .alternative-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .alternative-btn {
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s;
        }
        .alternative-btn.duckduckgo {
            background: #de5833;
            color: white;
        }
        .alternative-btn.google {
            background: #4285f4;
            color: white;
        }
        .alternative-btn.bing {
            background: #008373;
            color: white;
        }
        .alternative-btn:hover {
            transform: translateY(-3px);
            opacity: 0.9;
        }
        .btn-icon {
            font-size: 1.2rem;
        }
        .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 30px;
            background: var(--light-blue);
            color: var(--primary-blue);
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        .back-btn:hover {
            background: var(--primary-blue);
            color: white;
            transform: translateY(-2px);
        }
        .back-icon {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(noResultsStyle);
}

// Show search error
function showSearchError(query, errorMessage, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const searchTime = document.getElementById('searchTime');
    
    // Update time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    
    resultsContainer.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h3 class="error-title">Search Temporarily Unavailable</h3>
            <p class="error-subtitle">We're experiencing technical difficulties. Please try again in a moment.</p>
            
            <div class="error-details">
                <strong>Error details:</strong> ${errorMessage}
            </div>
            
            <div class="error-actions">
                <button onclick="window.location.reload()" class="error-btn retry">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">Retry Search</span>
                </button>
                <a href="index.html" class="error-btn back">
                    <span class="btn-icon">←</span>
                    <span class="btn-text">New Search</span>
                </a>
            </div>
            
            <div class="error-alternatives">
                <h4 class="alternative-title">Search on other engines:</h4>
                <div class="alternative-buttons">
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alt-btn duckduckgo">
                        DuckDuckGo
                    </a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="alt-btn google">
                        Google
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Add error CSS
    const errorStyle = document.createElement('style');
    errorStyle.textContent = `
        .error-container {
            text-align: center;
            padding: 40px 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            color: #ef4444;
        }
        .error-title {
            color: var(--text-dark);
            margin-bottom: 10px;
        }
        .error-subtitle {
            color: var(--text-light);
            margin-bottom: 25px;
        }
        .error-details {
            background: var(--light-red);
            color: var(--primary-red);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 0.9rem;
            text-align: left;
        }
        .error-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 40px;
        }
        .error-btn {
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s;
            text-decoration: none;
        }
        .error-btn.retry {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-red));
            color: white;
        }
        .error-btn.back {
            background: var(--light-blue);
            color: var(--primary-blue);
        }
        .error-btn:hover {
            transform: translateY(-3px);
            opacity: 0.9;
        }
        .error-alternatives {
            background: var(--light-blue);
            padding: 25px;
            border-radius: 12px;
        }
        .alternative-title {
            margin-bottom: 15px;
            color: var(--text-dark);
        }
        .alt-btn {
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 0 10px;
        }
        .alt-btn.duckduckgo {
            background: #de5833;
            color: white;
        }
        .alt-btn.google {
            background: #4285f4;
            color: white;
        }
    `;
    document.head.appendChild(errorStyle);
}

// Show pagination
function showPagination(currentPage, totalPages, query) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 1) return;
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `
            <a href="?q=${encodeURIComponent(query)}&page=${currentPage - 1}" class="page-btn prev">
                <span class="page-icon">←</span>
                <span class="page-text">Previous</span>
            </a>
        `;
    }
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    // First page
    if (startPage > 1) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=1" class="page-btn">1</a>`;
        if (startPage > 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    // Page range
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn active">${i}</span>`;
        } else {
            html += `<a href="?q=${encodeURIComponent(query)}&page=${i}" class="page-btn">${i}</a>`;
        }
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-dots">...</span>`;
        }
        html += `<a href="?q=${encodeURIComponent(query)}&page=${totalPages}" class="page-btn">${totalPages}</a>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `
            <a href="?q=${encodeURIComponent(query)}&page=${currentPage + 1}" class="page-btn next">
                <span class="page-text">Next</span>
                <span class="page-icon">→</span>
            </a>
        `;
    }
    
    pagination.innerHTML = html;
}

// Setup dark mode
function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('ymalDarkMode', document.body.classList.contains('dark-mode'));
        });
        
        // Load saved preference
        if (localStorage.getItem('ymalDarkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
    }
    
    // Add dark mode styles
    const darkModeStyle = document.createElement('style');
    darkModeStyle.textContent = `
        body.dark-mode {
            --bg-color: #111827;
            --text-dark: #f9fafb;
            --text-light: #d1d5db;
            --border-color: #374151;
            --white: #1f2937;
            --light-blue: #1e3a8a;
            --light-red: #7f1d1d;
        }
        body.dark-mode .result-item {
            background: #1f2937;
            border-color: #374151;
        }
        body.dark-mode .search-input-wrapper {
            background: #1f2937;
            border-color: #374151;
        }
        body.dark-mode #searchInput {
            background: #1f2937;
            color: #f9fafb;
        }
    `;
    document.head.appendChild(darkModeStyle);
}

// Setup search suggestions
function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(function() {
        const query = this.value.trim();
        if (query.length > 2) {
            // Could fetch suggestions from API here
            console.log('Potential suggestion for:', query);
        }
    }, 300));
}

// Utility: Debounce function
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

// Track result clicks (privacy-safe)
function trackResultClick(url, title) {
    // In production, this would send anonymous analytics
    console.log('Result clicked:', { url, title });
    return true;
}

// Add global styles for search results
const globalStyles = document.createElement('style');
globalStyles.textContent = `
    .animated-result {
        animation: slideIn 0.4s ease-out var(--delay, 0s) both;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .result-item {
        background: var(--white);
        padding: 25px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        border-left: 4px solid var(--primary-blue);
        position: relative;
        transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .result-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.1);
    }
    
    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .result-url {
        color: #0d9488;
        font-size: 0.85rem;
        word-break: break-all;
    }
    
    .result-rank {
        background: var(--light-blue);
        color: var(--primary-blue);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9rem;
    }
    
    .result-title {
        margin: 0 0 12px 0;
        font-size: 1.3rem;
        line-height: 1.4;
    }
    
    .result-link {
        color: var(--primary-blue);
        text-decoration: none;
        transition: color 0.2s;
    }
    
    .result-link:hover {
        color: var(--dark-blue);
        text-decoration: underline;
    }
    
    .result-snippet {
        color: var(--text-light);
        line-height: 1.6;
        margin-bottom: 15px;
        font-size: 0.95rem;
    }
    
    .result-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid var(--border-color);
    }
    
    .result-engine {
        background: var(--light-blue);
        color: var(--primary-blue);
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .result-score {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .score-bar {
        width: 100px;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }
    
    .score-bar::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: var(--score, 75%);
        background: var(--color, #3b82f6);
        border-radius: 4px;
        transition: width 1s ease-out;
    }
    
    .score-text {
        font-size: 0.85rem;
        color: var(--text-light);
        min-width: 90px;
    }
    
    .pagination {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 40px 0;
        flex-wrap: wrap;
    }
    
    .page-btn {
        padding: 10px 16px;
        background: var(--white);
        border: 2px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-dark);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 44px;
        justify-content: center;
    }
    
    .page-btn:hover {
        background: var(--light-blue);
        border-color: var(--primary-blue);
        color: var(--primary-blue);
        transform: translateY(-2px);
    }
    
    .page-btn.active {
        background: var(--primary-blue);
        border-color: var(--primary-blue);
        color: white;
    }
    
    .page-btn.prev,
    .page-btn.next {
        padding: 10px 20px;
    }
    
    .page-dots {
        padding: 10px 8px;
        color: var(--text-light);
        display: flex;
        align-items: center;
    }
`;
document.head.appendChild(globalStyles);
