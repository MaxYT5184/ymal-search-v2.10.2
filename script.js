// Fixed search function with working API
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Show loading
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading">🔍 Searching...</div>';
    }
    
    try {
        // Use SearXNG API directly (no serverless function needed yet)
        const results = await searchDirectly(query, page);
        
        // Update UI
        updateSearchResults(results, query, startTime);
        
        // Show pagination if we have results
        if (results.number_of_results > 0) {
            showPagination(page, results.number_of_results);
        }
        
    } catch (error) {
        console.error('Search error:', error);
        
        // Show fallback results
        showFallbackResults(query, startTime);
    }
}

// Direct search using SearXNG
async function searchDirectly(query, page = 1) {
    // Use CORS proxy to avoid CORS issues
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    
    // Public SearXNG instances
    const instances = [
        'https://searx.be',
        'https://search.disroot.org',
        'https://searx.tiekoetter.com'
    ];
    
    // Try each instance until one works
    for (const instance of instances) {
        try {
            const url = `${instance}/search?q=${encodeURIComponent(query)}&pageno=${page}&format=json`;
            const proxyUrl = corsProxy + encodeURIComponent(url);
            
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Ymal-Search/1.0'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    results: data.results || [],
                    number_of_results: data.number_of_results || 0,
                    suggestions: data.suggestions || [],
                    instance_used: instance
                };
            }
        } catch (error) {
            console.log(`Instance ${instance} failed, trying next...`);
            continue;
        }
    }
    
    throw new Error('All search instances failed');
}

// Fallback results when API fails
function showFallbackResults(query, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Update time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) {
        searchTime.textContent = elapsedTime.toFixed(2);
    }
    
    if (resultsCount) {
        resultsCount.textContent = '0';
    }
    
    // Show helpful message with search tips
    resultsContainer.innerHTML = `
        <div class="no-results">
            <h3>Search Engine Warming Up...</h3>
            <p>Our search API is initializing. Try these instead:</p>
            
            <div style="margin: 25px 0; text-align: left; max-width: 500px; margin: 25px auto;">
                <div style="background: var(--light-blue); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>Direct Google Search:</strong><br>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank">
                        https://www.google.com/search?q=${encodeURIComponent(query)}
                    </a>
                </div>
                
                <div style="background: var(--light-blue); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>Direct DuckDuckGo Search:</strong><br>
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank">
                        https://duckduckgo.com/?q=${encodeURIComponent(query)}
                    </a>
                </div>
            </div>
            
            <p>Or try:</p>
            <div style="margin: 15px 0;">
                <a href="?q=catfish" class="page-btn">catfish</a>
                <a href="?q=cooking" class="page-btn">cooking</a>
                <a href="?q=recipes" class="page-btn">recipes</a>
            </div>
            
            <div style="margin-top: 30px; font-size: 0.9rem; color: var(--text-light);">
                <p>⚠️ <strong>Note:</strong> Ymal Search is in beta. Full search functionality coming soon!</p>
            </div>
            
            <div style="margin-top: 20px;">
                <a href="index.html" class="page-btn">Back to Search</a>
            </div>
        </div>
    `;
}

// Update the updateSearchResults function to handle real data better
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
    
    // Clear container
    resultsContainer.innerHTML = '';
    
    // Check if no results
    if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>No results found for "${query}"</h3>
                <p>Try these suggestions:</p>
                
                <div style="margin: 20px 0;">
                    <a href="?q=${encodeURIComponent(query.split(' ')[0])}" class="page-btn">
                        Search for "${query.split(' ')[0]}"
                    </a>
                    <a href="?q=${encodeURIComponent(query + ' recipe')}" class="page-btn">
                        "${query} recipe"
                    </a>
                    <a href="?q=${encodeURIComponent(query + ' cooking')}" class="page-btn">
                        "${query} cooking"
                    </a>
                </div>
                
                <p style="margin-top: 25px; color: var(--text-light);">
                    Or try a different search engine:
                </p>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px; flex-wrap: wrap;">
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank" 
                       style="padding: 10px 20px; background: #4285f4; color: white; border-radius: 6px; text-decoration: none;">
                        Search on Google
                    </a>
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
                       target="_blank"
                       style="padding: 10px 20px; background: #de5833; color: white; border-radius: 6px; text-decoration: none;">
                        Search on DuckDuckGo
                    </a>
                    <a href="https://www.bing.com/search?q=${encodeURIComponent(query)}" 
                       target="_blank"
                       style="padding: 10px 20px; background: #008373; color: white; border-radius: 6px; text-decoration: none;">
                        Search on Bing
                    </a>
                </div>
                
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
    
    // Show instance used
    if (data.instance_used) {
        const instanceInfo = document.createElement('div');
        instanceInfo.style.cssText = `
            margin-top: 30px;
            padding: 15px;
            background: var(--light-blue);
            border-radius: 8px;
            text-align: center;
            color: var(--text-light);
            font-size: 0.9rem;
        `;
        instanceInfo.innerHTML = `
            Results from: <strong>${new URL(data.instance_used).hostname}</strong>
        `;
        resultsContainer.appendChild(instanceInfo);
    }
}
