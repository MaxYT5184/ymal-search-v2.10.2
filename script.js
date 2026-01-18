// WORKING SEARCH FUNCTION WITH CORS PROXY
async function performSearch(query, page = 1) {
    const startTime = Date.now();
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Show loading
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="loading">
                <div style="font-size: 2rem; margin-bottom: 15px;">🔍</div>
                <p>Searching for "${query}"...</p>
                <p style="font-size: 0.9rem; color: var(--text-light); margin-top: 10px;">
                    Fetching results from privacy-respecting sources
                </p>
            </div>
        `;
    }
    
    try {
        // Use CORS proxy to bypass CORS restrictions
        const results = await searchWithProxy(query, page);
        
        // Update UI with results
        updateSearchResults(results, query, startTime);
        
    } catch (error) {
        console.error('Search failed:', error);
        
        // Show demo results as fallback
        showDemoResults(query, startTime);
    }
}

// Search using CORS proxy
async function searchWithProxy(query, page = 1) {
    // List of CORS proxies (free, public)
    const corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    // List of SearXNG instances
    const searxInstances = [
        'https://searx.be',
        'https://search.disroot.org',
        'https://searx.tiekoetter.com'
    ];
    
    // Try each combination until one works
    for (const proxy of corsProxies) {
        for (const instance of searxInstances) {
            try {
                const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&pageno=${page}&format=json`;
                const proxyUrl = proxy + encodeURIComponent(searchUrl);
                
                console.log(`Trying: ${instance} via ${proxy}`);
                
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Ymal-Search/1.0 (+https://search.ymal.space)'
                    },
                    timeout: 10000
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                // Handle different proxy response formats
                let searchData;
                if (proxy.includes('allorigins.win')) {
                    searchData = JSON.parse(data.contents);
                } else {
                    searchData = data;
                }
                
                if (searchData.results && searchData.results.length > 0) {
                    console.log(`Success with ${instance} via ${proxy}`);
                    return {
                        results: searchData.results,
                        number_of_results: searchData.number_of_results || searchData.results.length,
                        suggestions: searchData.suggestions || [],
                        instance_used: instance
                    };
                }
                
            } catch (err) {
                console.log(`Failed: ${instance} via ${proxy}`, err.message);
                continue;
            }
        }
    }
    
    throw new Error('All search attempts failed');
}

// Demo results for fallback
function showDemoResults(query, startTime) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    const searchTime = document.getElementById('searchTime');
    
    // Update time
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (searchTime) searchTime.textContent = elapsedTime.toFixed(2);
    if (resultsCount) resultsCount.textContent = '5';
    
    // Demo results based on query
    const demoResults = getDemoResultsForQuery(query);
    
    resultsContainer.innerHTML = '';
    
    // Show demo results header
    const demoHeader = document.createElement('div');
    demoHeader.style.cssText = `
        background: linear-gradient(135deg, var(--primary-blue), var(--primary-red));
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    `;
    demoHeader.innerHTML = `
        <strong>✨ Demo Results</strong>
        <p style="margin: 5px 0 0; font-size: 0.9rem; opacity: 0.9;">
            Real search results coming soon! Meanwhile, try these demo results.
        </p>
    `;
    resultsContainer.appendChild(demoHeader);
    
    // Display demo results
    demoResults.forEach((result, index) => {
        const resultElement = createResultElement(result, index + 1);
        resultsContainer.appendChild(resultElement);
    });
    
    // Add search elsewhere option
    const searchElsewhere = document.createElement('div');
    searchElsewhere.style.cssText = `
        margin-top: 30px;
        padding: 20px;
        background: var(--light-blue);
        border-radius: 10px;
        text-align: center;
    `;
    searchElsewhere.innerHTML = `
        <h4 style="margin-bottom: 15px; color: var(--text-dark);">Search on other engines:</h4>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" 
               target="_blank"
               class="page-btn" style="background: #de5833; color: white; border: none;">
                DuckDuckGo
            </a>
            <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" 
               target="_blank"
               class="page-btn" style="background: #4285f4; color: white; border: none;">
                Google
            </a>
            <a href="https://www.bing.com/search?q=${encodeURIComponent(query)}" 
               target="_blank"
               class="page-btn" style="background: #008373; color: white; border: none;">
                Bing
            </a>
        </div>
    `;
    resultsContainer.appendChild(searchElsewhere);
}

// Get relevant demo results based on query
function getDemoResultsForQuery(query) {
    query = query.toLowerCase();
    
    if (query.includes('catfish') || query.includes('fish') || query.includes('eat')) {
        return [
            {
                title: "How to Cook Catfish Perfectly Every Time",
                url: "https://example.com/catfish-cooking",
                content: "Learn the best methods for cooking catfish including frying, baking, and grilling techniques for delicious results.",
                engine: "Cooking Guide"
            },
            {
                title: "Catfish Recipes: 10 Easy Dinner Ideas",
                url: "https://example.com/catfish-recipes",
                content: "From Southern fried catfish to healthy baked options, discover delicious catfish recipes for any occasion.",
                engine: "Recipe Database"
            },
            {
                title: "Is Catfish Healthy? Nutrition Facts & Benefits",
                url: "https://example.com/catfish-nutrition",
                content: "Catfish is a good source of protein and omega-3 fatty acids. Learn about its health benefits and nutritional value.",
                engine: "Health & Nutrition"
            },
            {
                title: "Fishing for Catfish: Tips and Techniques",
                url: "https://example.com/catfish-fishing",
                content: "Complete guide to catching catfish including best bait, equipment, and locations for successful fishing trips.",
                engine: "Fishing Guide"
            },
            {
                title: "Different Types of Catfish Around the World",
                url: "https://example.com/catfish-types",
                content: "Explore various catfish species from channel catfish to Mekong giant catfish and their unique characteristics.",
                engine: "Biology & Species"
            }
        ];
    }
    
    // Default demo results
    return [
        {
            title: "Introduction to Private Search Engines",
            url: "https://ymal.space/about.html",
            content: "Learn how private search engines like Ymal protect your privacy while delivering accurate results.",
            engine: "Ymal Resources"
        },
        {
            title: "Understanding Online Privacy in 2024",
            url: "https://ymal.space/blog.html",
            content: "Comprehensive guide to protecting your privacy online with practical tips and tools.",
            engine: "Privacy Guide"
        },
        {
            title: "How Search Engines Work: Behind the Scenes",
            url: "https://ymal.space/about-search.html",
            content: "Explore the technology behind search engines and how they deliver results in milliseconds.",
            engine: "Technology"
        },
        {
            title: "The Importance of Digital Privacy",
            url: "https://ymal.space/privacy-policy.html",
            content: "Why privacy matters in the digital age and how to take control of your personal data.",
            engine: "Privacy Education"
        },
        {
            title: "Try Ymal Search - Privacy Focused Search Engine",
            url: "https://search.ymal.space",
            content: "Experience search without tracking. Ymal delivers fast, accurate results while protecting your privacy.",
            engine: "Ymal Search"
        }
    ];
}
