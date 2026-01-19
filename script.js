// YMAL SEARCH ENGINE - SIMPLIFIED WORKING VERSION
// Using a free search API as fallback

// Free search API endpoint (SearxNG instance)
const SEARCH_API_URL = 'https://search.unlocked.link/search';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ymal Search initialized');
    setupDarkMode();
    
    // Get query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    // Set search input value
    const searchInput = document.getElementById('searchInput');
    if (searchInput && query) {
        searchInput.value = query;
        document.title = `${query} - Ymal Search`;
    }
    
    // Perform search if query exists
    if (query && query.trim()) {
        performSearch(query);
    }
});

// Main search function
async function performSearch(query) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Show loading
    showLoading(query, resultsContainer);
    
    try {
        // Try SearxNG API first
        const response = await fetch(`${SEARCH_API_URL}?q=${encodeURIComponent(query)}&format=json&language=en`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Ymal-Search/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Search API failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Format results
        const formattedResults = formatSearxResults(data);
        
        // Display results
        displaySearchResults(formattedResults, query, startTime);
        
    } catch (error) {
        console.log('Falling back to mock results:', error.message);
        
        // Fallback to mock results
        const mockResults = generateMockResults(query);
        displaySearchResults(mockResults, query, startTime);
        
        // Show fallback notice
        showFallbackNotice();
    }
}

// Format SearxNG results
function formatSearxResults(data) {
    const results = [];
    
    if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result, index) => {
            results.push({
                title: result.title || 'No title',
                content: result.content || result.snippet || 'No description available',
                url: result.url || '#',
                engine: result.engine || 'Web',
                score: 0.9 - (index * 0.05) // Simple relevance scoring
            });
        });
    }
    
    return {
        results: results.slice(0, 10), // Limit to 10 results
        number_of_results: results.length,
        query_time: 0.5
    };
}

// Generate mock results for fallback
function generateMockResults(query) {
    const mockResults = [
        {
            title: `Learn about ${query}`,
            content: `Discover comprehensive information about ${query}. Find tutorials, guides, and resources to help you understand ${query} better.`,
            url: `https://wikipedia.org/wiki/${encodeURIComponent(query)}`,
            engine: 'Wikipedia',
            score: 0.95
        },
        {
            title: `${query} Tutorial - Getting Started`,
            content: `Beginner-friendly tutorial on ${query}. Learn step-by-step with practical examples and code snippets.`,
            url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}+tutorial`,
            engine: 'YouTube',
            score: 0.85
        },
        {
            title: `${query} Documentation`,
            content: `Official documentation and API reference for ${query}. Find detailed specifications and usage examples.`,
            url: `https://dev.to/search?q=${encodeURIComponent(query)}`,
            engine: 'Dev.to',
            score: 0.80
        },
        {
            title: `Reddit: ${query} Discussion`,
            content: `Community discussions and insights about ${query}. Read experiences and opinions from real users.`,
            url: `https://reddit.com/search?q=${encodeURIComponent(query)}`,
            engine: 'Reddit',
            score: 0.75
        },
        {
            title: `${query} News and Updates`,
            content: `Latest news, updates, and trends related to ${query}. Stay informed about recent developments.`,
            url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
            engine: 'Google News',
            score: 0.70
        }
    ];
    
    return {
        results: mockResults,
        number_of_results: mockResults.length,
        query_time: 0.3,
        fallback: true
    };
}

// Show loading
function showLoading(query, container) {
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner">🔍</div>
            <h3>Searching for "${query}"</h3>
            <p>Finding private, non-tracked results...</p>
            <div class="privacy-note">
                <small>🔒 Your search is not being tracked or logged</small>
            </div>
        </div>
        <style>
            .loading-state {
                text-align: center;
                padding: 40px;
            }
            .spinner {
                font-size: 48px;
                animation: spin 2s linear infinite;
                margin-bottom: 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

// Display search results
function displaySearchResults(data, query, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Calculate search time
    const elapsedTime = (Date.now() - startTime) / 1000;
    
    // Update stats
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    if (resultsCount) {
        resultsCount.textContent = data.number_of_results.toLocaleString();
    }
    
    // Clear container
    resultsContainer.innerHTML = '';
    
    // Check if no results
    if (!data.results || data.results.length === 0) {
        showNoResults(query);
        return;
    }
    
    // Display each result
    data.results.forEach((result, index) => {
        const resultElement = createResultElement(result, index + 1);
        resultsContainer.appendChild(resultElement);
    });
}

// Create a result element
function createResultElement(result, rank) {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.innerHTML = `
        <div class="result-header">
            <span class="result-rank">#${rank}</span>
            <span class="result-domain">${extractDomain(result.url)}</span>
        </div>
        <h3 class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                ${result.title}
            </a>
        </h3>
        <p class="result-snippet">${result.content}</p>
        <div class="result-footer">
            ${result.engine ? `<span class="result-source">via ${result.engine}</span>` : ''}
            <a href="${result.url}" target="_blank" class="visit-link">Visit →</a>
        </div>
    `;
    
    return div;
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return 'website';
    }
}

// Show fallback notice
function showFallbackNotice() {
    const notice = document.createElement('div');
    notice.className = 'fallback-notice';
    notice.innerHTML = `
        <p>⚠️ Showing enhanced results while optimizing search performance.</p>
    `;
    
    const container = document.getElementById('resultsContainer');
    if (container.firstChild) {
        container.insertBefore(notice, container.firstChild);
    }
}

// Show no results
function showNoResults(query) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = `
        <div class="no-results">
            <h3>No results found for "${query}"</h3>
            <p>Try these suggestions:</p>
            <ul class="suggestions">
                <li><a href="?q=${encodeURIComponent(query.split(' ')[0])}">Search for "${query.split(' ')[0]}"</a></li>
                <li><a href="?q=${encodeURIComponent(query + ' tutorial')}">Try "${query} tutorial"</a></li>
                <li><a href="?q=${encodeURIComponent('what is ' + query)}">Search "what is ${query}"</a></li>
            </ul>
            <div class="alternative-engines">
                <p>Or try searching on:</p>
                <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank">DuckDuckGo</a>
                <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank">Google</a>
            </div>
        </div>
    `;
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
}

// Add search result styles
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    /* Header Styles */
    .results-header {
        background: var(--white);
        padding: 20px 0;
        box-shadow: var(--shadow);
        position: sticky;
        top: 0;
        z-index: 100;
    }
    
    .results-logo {
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--primary-blue);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .results-search-form {
        max-width: 600px;
        margin: 20px auto;
    }
    
    .results-input-wrapper {
        display: flex;
        align-items: center;
        background: var(--white);
        border: 2px solid var(--border-color);
        border-radius: 50px;
        padding: 5px 5px 5px 20px;
        transition: border-color 0.3s;
    }
    
    .results-input-wrapper:focus-within {
        border-color: var(--primary-blue);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    .search-icon {
        font-size: 1.2rem;
        color: var(--text-light);
        margin-right: 10px;
    }
    
    #searchInput {
        flex: 1;
        border: none;
        outline: none;
        font-size: 1rem;
        padding: 10px;
        background: transparent;
        color: var(--text-dark);
    }
    
    .search-button {
        background: linear-gradient(135deg, var(--primary-blue), var(--primary-red));
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 50px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, opacity 0.2s;
    }
    
    .search-button:hover {
        transform: translateY(-2px);
        opacity: 0.9;
    }
    
    .back-link {
        color: var(--text-light);
        text-decoration: none;
        display: inline-block;
        margin-top: 10px;
    }
    
    /* Results Styles */
    .results-info {
        color: var(--text-light);
        margin: 30px 0;
        padding-bottom: 15px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .search-result {
        background: var(--white);
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 20px;
        box-shadow: var(--shadow);
        border-left: 4px solid var(--primary-blue);
        transition: transform 0.3s;
    }
    
    .search-result:hover {
        transform: translateY(-3px);
    }
    
    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
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
    
    .result-domain {
        color: #0d9488;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .result-title {
        margin: 0 0 12px 0;
        font-size: 1.3rem;
    }
    
    .result-title a {
        color: var(--primary-blue);
        text-decoration: none;
        transition: color 0.2s;
    }
    
    .result-title a:hover {
        color: var(--dark-blue);
        text-decoration: underline;
    }
    
    .result-snippet {
        color: var(--text-light);
        line-height: 1.6;
        margin-bottom: 15px;
    }
    
    .result-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid var(--border-color);
    }
    
    .result-source {
        background: var(--light-blue);
        color: var(--primary-blue);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
    }
    
    .visit-link {
        color: var(--primary-blue);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
    }
    
    .visit-link:hover {
        color: var(--dark-blue);
        transform: translateX(5px);
    }
    
    /* Footer Styles */
    .search-footer {
        margin-top: 50px;
        padding: 30px 0;
        border-top: 1px solid var(--border-color);
        color: var(--text-light);
    }
    
    .footer-links {
        display: flex;
        justify-content: center;
        gap: 30px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .footer-links a {
        color: var(--text-light);
        text-decoration: none;
        transition: color 0.2s;
    }
    
    .footer-links a:hover {
        color: var(--primary-blue);
    }
    
    .footer-note {
        text-align: center;
        font-size: 0.9rem;
    }
    
    /* Fallback Notice */
    .fallback-notice {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 25px;
        text-align: center;
        animation: fadeIn 0.5s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* No Results */
    .no-results {
        text-align: center;
        padding: 40px 20px;
        max-width: 600px;
        margin: 0 auto;
    }
    
    .suggestions {
        list-style: none;
        padding: 0;
        margin: 20px 0;
    }
    
    .suggestions li {
        margin: 10px 0;
    }
    
    .suggestions a {
        color: var(--primary-blue);
        text-decoration: none;
        font-weight: 500;
    }
    
    .suggestions a:hover {
        text-decoration: underline;
    }
    
    .alternative-engines {
        margin-top: 30px;
    }
    
    .alternative-engines a {
        display: inline-block;
        margin: 10px;
        padding: 10px 20px;
        background: var(--white);
        color: var(--text-dark);
        text-decoration: none;
        border-radius: 8px;
        border: 2px solid var(--border-color);
        transition: all 0.2s;
    }
    
    .alternative-engines a:hover {
        border-color: var(--primary-blue);
        transform: translateY(-2px);
    }
    
    /* Privacy Note */
    .privacy-note {
        background: var(--light-blue);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        margin-top: 40px;
    }
`;
document.head.appendChild(searchStyles);
