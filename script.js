// Search functionality for search.ymal.space

// Public SearXNG instances (we'll use these as search backends)
const SEARXNG_INSTANCES = [
    'https://searx.be',
    'https://search.disroot.org',
    'https://searx.tiekoetter.com'
];

// Fallback search APIs
const FALLBACK_APIS = {
    duckduckgo: 'https://api.duckduckgo.com/?q={query}&format=json&no_html=1',
    wikipedia: 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&origin=*',
    google: 'https://www.googleapis.com/customsearch/v1?key={key}&cx={cx}&q={query}'
};

// Search shortcuts
const SEARCH_SHORTCUTS = {
    '!yt': 'YouTube',
    '!w': 'Wikipedia',
    '!r': 'Reddit',
    '!img': 'Images',
    '!news': 'News',
    '!maps': 'Maps',
    '!translate': 'Translate'
};

// Perform search
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    
    // Check for shortcuts
    const shortcut = Object.keys(SEARCH_SHORTCUTS).find(s => query.startsWith(s));
    if (shortcut) {
        // Remove shortcut from query
        query = query.replace(shortcut, '').trim();
        // Show shortcut info
        showShortcutInfo(shortcut, SEARCH_SHORTCUTS[shortcut]);
    }
    
    try {
        // Try primary SearXNG instance
        const results = await searchWithSearXNG(query, page);
        
        // Update UI
        updateSearchResults(results, query, startTime);
        
        // Show pagination
        showPagination(page, results.number_of_results || 0);
        
    } catch (error) {
        console.error('Search failed:', error);
        
        // Try fallback
        try {
            const fallbackResults = await searchWithFallback(query);
            updateSearchResults(fallbackResults, query, startTime);
        } catch (fallbackError) {
            showError('Search temporarily unavailable. Please try again later.');
        }
    }
}

// Search using SearXNG
async function searchWithSearXNG(query, page = 1) {
    // Select random instance
    const instance = SEARXNG_INSTANCES[Math.floor(Math.random() * SEARXNG_INSTANCES.length)];
    const url = `${instance}/search?q=${encodeURIComponent(query)}&pageno=${page}&format=json`;
    
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
    
    if (!response.ok) {
        throw new Error('Search API failed');
    }
    
    const data = await response.json();
    return data;
}

// Fallback search
async function searchWithFallback(query) {
    // Simple fallback - we'll implement this later
    return {
        results: [],
        number_of_results: 0,
        suggestions: []
    };
}

// Update search results in UI
function updateSearchResults(data, query, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    if (!resultsContainer) return;
    
    // Update stats
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) {
        searchTime.textContent = elapsedTime.toFixed(2);
    }
    
    if (resultsCount) {
        const count = data.number_of_results || data.results?.length || 0;
        resultsCount.textContent = count.toLocaleString();
    }
    
    // Clear loading
    resultsContainer.innerHTML = '';
    
    // Check if no results
    if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>No results found for "${query}"</h3>
                <p>Try different keywords or check your spelling.</p>
                <div style="margin-top: 20px;">
                    <a href="index.html" class="page-btn">Back to Search</a>
                </div>
            </div>
        `;
        return;
    }
    
    // Display results
    data.results.forEach((result, index) => {
        const resultElement = createResultElement(result, index + 1);
        resultsContainer.appendChild(resultElement);
    });
    
    // Show suggestions if available
    if (data.suggestions && data.suggestions.length > 0) {
        showSuggestions(data.suggestions, query);
    }
}

// Create result HTML element
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = 'result-item';
    
    // Format URL
    let displayUrl = result.url || '';
    try {
        const urlObj = new URL(displayUrl);
        displayUrl = urlObj.hostname + urlObj.pathname;
        if (displayUrl.length > 60) {
            displayUrl = displayUrl.substring(0, 60) + '...';
        }
    } catch (e) {
        // Invalid URL, use as-is
    }
    
    // Format snippet
    let snippet = result.content || result.description || '';
    if (snippet.length > 200) {
        snippet = snippet.substring(0, 200) + '...';
    }
    
    // Format title
    let title = result.title || 'Untitled';
    if (title.length > 80) {
        title = title.substring(0, 80) + '...';
    }
    
    div.innerHTML = `
        <div class="result-url">${displayUrl}</div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer">${title}</a>
        </h3>
        <div class="result-snippet">${snippet}</div>
        <div class="result-meta">
            ${result.engine ? `<span>Source: ${result.engine}</span>` : ''}
            ${result.publishedDate ? `<span>Date: ${new Date(result.publishedDate).toLocaleDateString()}</span>` : ''}
        </div>
    `;
    
    return div;
}

// Show pagination
function showPagination(currentPage, totalResults) {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalResults <= 10) return;
    
    const totalPages = Math.ceil(totalResults / 10);
    const maxPagesToShow = 5;
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `<a href="?q=${encodeURIComponent(getCurrentQuery())}&page=${currentPage - 1}" class="page-btn">← Previous</a>`;
    }
    
    // Page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="page-btn active">${i}</span>`;
        } else {
            html += `<a href="?q=${encodeURIComponent(getCurrentQuery())}&page=${i}" class="page-btn">${i}</a>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?q=${encodeURIComponent(getCurrentQuery())}&page=${currentPage + 1}" class="page-btn">Next →</a>`;
    }
    
    pagination.innerHTML = html;
}

// Show shortcut info
function showShortcutInfo(shortcut, description) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        const info = document.createElement('div');
        info.className = 'shortcut-info';
        info.style.cssText = `
            background: var(--light-blue);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid var(--primary-blue);
        `;
        info.innerHTML = `
            <strong>${shortcut}</strong> - ${description} search
        `;
        resultsContainer.prepend(info);
    }
}

// Show suggestions
function showSuggestions(suggestions, originalQuery) {
    const container = document.querySelector('.results-main .container');
    if (!container || !suggestions.length) return;
    
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions';
    suggestionsDiv.style.cssText = `
        background: var(--white);
        padding: 20px;
        border-radius: 10px;
        margin: 30px 0;
        box-shadow: 0 3px 10px rgba(0,0,0,0.05);
    `;
    
    let html = '<h4 style="margin-bottom: 10px; color: var(--text-dark);">Did you mean:</h4><div>';
    
    suggestions.forEach(suggestion => {
        html += `
            <a href="?q=${encodeURIComponent(suggestion)}" 
               style="display: inline-block; margin: 5px; padding: 8px 15px; 
                      background: var(--light-blue); color: var(--primary-blue);
                      border-radius: 20px; text-decoration: none; font-size: 0.9rem;">
                ${suggestion}
            </a>
        `;
    });
    
    html += '</div>';
    suggestionsDiv.innerHTML = html;
    
    // Insert after results
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        container.insertBefore(suggestionsDiv, resultsContainer.nextSibling);
    }
}

// Show error
function showError(message) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>Search Error</h3>
                <p>${message}</p>
                <div style="margin-top: 20px;">
                    <a href="index.html" class="page-btn">Back to Search</a>
                </div>
            </div>
        `;
    }
}

// Get current query from URL
function getCurrentQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || '';
}

// Auto-suggestions for search box
function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // This would connect to a suggestions API
    // For now, we'll just store recent searches
    searchInput.addEventListener('input', async function() {
        const query = this.value.trim();
        if (query.length < 2) return;
        
        // Could fetch suggestions from an API here
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupSearchSuggestions();
    
    // Add dark mode styles if needed
    if (!document.querySelector('style[data-dark-mode]')) {
        const darkModeStyles = document.createElement('style');
        darkModeStyles.setAttribute('data-dark-mode', 'true');
        darkModeStyles.textContent = `
            body.dark-mode {
                --bg-color: #111827;
                --text-dark: #f9fafb;
                --text-light: #d1d5db;
                --border-color: #374151;
                --white: #1f2937;
                --light-blue: #1e3a8a;
                --light-red: #7f1d1d;
            }
        `;
        document.head.appendChild(darkModeStyles);
    }
});
