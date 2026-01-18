// YMAL SEARCH ENGINE - COMPLETE WORKING VERSION WITH CLOUDFLARE WORKER
const SEARCH_PROXY_URL = 'https://ymal-search-proxy.a-tormen2012.workers.dev';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const page = urlParams.get('page') || '1';
    
    // Set search input value
    const searchInput = document.getElementById('searchInput');
    if (searchInput && query) {
        searchInput.value = query;
        document.title = `${query} - Ymal Search`;
    }
    
    // Perform search if query exists
    if (query && query.trim()) {
        performSearch(query, parseInt(page));
    }
    
    // Setup search suggestions
    setupSearchSuggestions();
    
    // Setup dark mode if toggled before
    if (localStorage.getItem('ymalDarkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
});

// Main search function using Cloudflare Worker
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Show loading animation
    resultsContainer.innerHTML = `
        <div class="loading">
            <div style="font-size: 3rem; margin-bottom: 20px; animation: spin 1.5s linear infinite;">🔍</div>
            <h3>Searching Ymal for "${query}"</h3>
            <p style="color: var(--text-light); margin-top: 10px;">
                Fetching private results from our secure proxy...
            </p>
            <p style="font-size: 0.9rem; margin-top: 20px; color: var(--primary-blue);">
                <strong>🔒 Privacy Protected:</strong> Your search is not tracked or logged
            </p>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </div>
    `;
    
    try {
        // Call your Cloudflare Worker
        const response = await fetch(`${SEARCH_PROXY_URL}/?q=${encodeURIComponent(query)}&page=${page}`, {
            headers: {
                'Accept': 'application/json',
                'X-Ymal-Search': 'v1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Proxy responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display results
        displaySearchResults(data, query, startTime, page);
        
        // Show fallback notice if using demo results
        if (data.fallback) {
            showFallbackNotice(data.message || 'Using enhanced results');
        }
        
    } catch (error) {
        console.error('Search failed:', error);
        
        // Show error with retry option
        showSearchError(query, error.message, startTime);
    }
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
        <div style="background: linear-gradient(135deg, var(--primary-blue), var(--primary-red)); 
                    color: white; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 0.95rem;">
                ✅ Found ${data.results.length} results for "${query}" 
                ${data.instance_used ? `via ${new URL(data.instance_used).hostname}` : ''}
            </p>
        </div>
    `;
    resultsContainer.appendChild(successMsg);
    
    // Display each result
    data.results.forEach((result, index) => {
        const resultElement = createResultElement(result, index + 1);
        resultsContainer.appendChild(resultElement);
    });
    
    // Add pagination if we have enough results
    if (data.number_of_results > 10) {
        showPagination(currentPage, Math.ceil(data.number_of_results / 10), query);
    }
    
    // Add privacy footer
    const privacyFooter = document.createElement('div');
    privacyFooter.className = 'privacy-footer';
    privacyFooter.innerHTML = `
        <div style="margin-top: 40px; padding: 20px; background: var(--light-blue); border-radius: 10px; text-align: center;">
            <h4 style="margin-bottom: 10px; color: var(--text-dark);">🔒 Search Privacy Guaranteed</h4>
            <p style="color: var(--text-light); margin-bottom: 15px; font-size: 0.95rem;">
                Your search for "${query}" was not tracked, logged, or stored.<br>
                No cookies were used. No personal data was collected.
            </p>
            <a href="https://ymal.space/privacy-policy.html" 
               style="color: var(--primary-blue); text-decoration: none; font-weight: 600;">
               Read our Privacy Policy →
            </a>
        </div>
    `;
    resultsContainer.appendChild(privacyFooter);
}

// Create a result element
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.style.animation = `fadeIn 0.3s ease-out ${rank * 0.1}s both`;
    
    // Format URL for display
    let displayUrl = result.url || '';
    try {
        const urlObj = new URL(displayUrl);
        displayUrl = urlObj.hostname.replace('www.', '');
        if (displayUrl.length > 30) {
            displayUrl = displayUrl.substring(0, 30) + '...';
        }
    } catch (e) {
        // If URL parsing fails, use as-is
    }
    
    // Format title and content
    const title = result.title || 'No title';
    let content = result.content || result.description || 'No description available';
    
    // Truncate content if too long
    if (content.length > 200) {
        content = content.substring(0, 200) + '...';
    }
    
    div.innerHTML = `
        <div class="result-url">${displayUrl}</div>
        <div class="result-rank">#${rank}</div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer" 
               onclick="trackClick('${encodeURIComponent(result.url)}')">
                ${title}
            </a>
        </h3>
        <div class="result-snippet">${content}</div>
        <div class="result-meta">
            ${result.engine ? `<span class="result-engine">${result.engine}</span>` : ''}
            ${result.score ? `<span class="result-score">Relevance: ${Math.round(result.score * 100)}%</span>` : ''}
        </div>
    `;
    
    return div;
}

// Show fallback notice
function showFallbackNotice(message) {
    const notice = document.createElement('div');
    notice.className = 'fallback-notice';
    notice.innerHTML = `
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); 
                    color: white; padding: 15px; border-radius: 10px; 
                    margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; font-weight: 600;">
                ⚠️ ${message}
            </p>
            <p style="margin: 5px 0 0; font-size: 0.9rem; opacity: 0.9;">
                Real-time search results will be available shortly
            </p>
        </div>
    `;
    
    const container = document.getElementById('resultsContainer');
    if (container && container.firstChild) {
        container.insertBefore(notice, container.firstChild);
    }
}

// Show no results message
function showNoResultsMessage(query) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    resultsContainer.innerHTML = `
        <div class="no-results">
            <div style="font-size: 4rem; margin-bottom: 20px;">🔍</div>
            <h3>No results found for "${query}"</h3>
            <p style="color: var(--text-light); margin-bottom: 25px;">
                Try these suggestions or refine your search:
            </p>
            
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px;">
                <a href="?q=${encodeURIComponent(query.split(' ')[0])}" class="suggestion-btn">
                    "${query.split(' ')[0]}"
                </a>
                <a href="?q=${encodeURIComponent(query + ' guide')}" class="suggestion-btn">
                    "${query} guide"
                </a>
                <a href="?q=${encodeURIComponent(query + ' tutorial')}" class="suggestion-btn">
                    "${query} tutorial"
                </a>
                <a href="?q=${encodeURIComponent('how to ' + query)}" class="suggestion-btn">
                    "how to ${query}"
                </a>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: var(--light-blue); border-radius: 10px;">
                <h4 style="margin-bottom: 15px; color: var(--text-dark);">Try searching on:</h4>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank" class="external-search-btn">
                        DuckDuckGo
                    </a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="external-search-btn">
                        Google
                    </a>
                    <a href="https://www.bing.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="external-search-btn">
                        Bing
                    </a>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <a href="index.html" class="back-btn">← Back to Search</a>
            </div>
        </div>
    `;
}

// Show search error
function showSearchError(query, errorMessage, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const searchTime = document.getElementById('searchTime');
    
    // Update time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    
    resultsContainer.innerHTML = `
        <div class="search-error">
            <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
            <h3>Search Temporarily Unavailable</h3>
            <p style="color: var(--text-light); margin-bottom: 20px;">
                We're experiencing technical difficulties. Please try again in a moment.
            </p>
            <p style="font-size: 0.9rem; color: var(--primary-red); background: var(--light-red); 
               padding: 10px; border-radius: 6px; margin-bottom: 25px;">
                <strong>Error:</strong> ${errorMessage}
            </p>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 30px;">
                <button onclick="window.location.reload()" class="retry-btn">
                    🔄 Retry Search
                </button>
                <a href="index.html" class="back-btn">
                    ← New Search
                </a>
            </div>
            
            <div style="padding: 20px; background: var(--light-blue); border-radius: 10px;">
                <h4 style="margin-bottom: 15px; color: var(--text-dark);">Search elsewhere:</h4>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank" class="external-search-btn small">
                        DuckDuckGo
                    </a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" class="external-search-btn small">
                        Google
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Show pagination
function showPagination(currentPage, totalPages, query) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 1) return;
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage - 1}" class="page-btn prev">← Previous</a>`;
    }
    
    // Page numbers (show up to 5 pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn active">${i}</span>`;
        } else {
            html += `<a href="?q=${encodeURIComponent(query)}&page=${i}" class="page-btn">${i}</a>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?q=${encodeURIComponent(query)}&page=${currentPage + 1}" class="page-btn next">Next →</a>`;
    }
    
    pagination.innerHTML = html;
}

// Setup search suggestions
function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Add input event listener for future suggestions
    searchInput.addEventListener('input', function() {
        // Could implement search suggestions here later
    });
}

// Click tracking (privacy-safe, just counts clicks)
function trackClick(url) {
    // In a real implementation, this would send anonymous click data
    // For now, just log to console
    console.log('Result clicked:', url);
    return true;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    .result-item {
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .suggestion-btn {
        padding: 8px 16px;
        background: var(--light-blue);
        color: var(--primary-blue);
        border-radius: 20px;
        text-decoration: none;
        font-size: 0.9rem;
        transition: all 0.2s;
    }
    
    .suggestion-btn:hover {
        background: var(--primary-blue);
        color: white;
        transform: translateY(-2px);
    }
    
    .external-search-btn {
        padding: 12px 24px;
        background: var(--primary-blue);
        color: white;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
        border: none;
        cursor: pointer;
    }
    
    .external-search-btn:hover {
        opacity: 0.9;
        transform: translateY(-2px);
    }
    
    .external-search-btn.small {
        padding: 8px 16px;
        font-size: 0.9rem;
    }
    
    .back-btn {
        padding: 10px 20px;
        background: var(--light-blue);
        color: var(--primary-blue);
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        display: inline-block;
    }
    
    .retry-btn {
        padding: 12px 24px;
        background: linear-gradient(135deg, var(--primary-blue), var(--primary-red));
        color: white;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .retry-btn:hover {
        transform: translateY(-2px);
        opacity: 0.9;
    }
    
    .result-rank {
        position: absolute;
        top: 15px;
        right: 15px;
        background: var(--light-blue);
        color: var(--primary-blue);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.8rem;
    }
    
    .result-engine {
        background: var(--light-blue);
        color: var(--primary-blue);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
    }
    
    .result-score {
        background: var(--light-red);
        color: var(--primary-red);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
    }
    
    .page-btn {
        padding: 8px 15px;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-dark);
        text-decoration: none;
        transition: all 0.2s;
    }
    
    .page-btn:hover {
        background: var(--light-blue);
        border-color: var(--primary-blue);
    }
    
    .page-btn.active {
        background: var(--primary-blue);
        color: white;
        border-color: var(--primary-blue);
    }
    
    .page-btn.prev, .page-btn.next {
        padding: 8px 20px;
    }
`;
document.head.appendChild(style);
