// Serverless function for search API
// Deploy to Vercel, Netlify, or Cloudflare Workers

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { q: query, page = 1 } = req.query;
    
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    try {
        // List of public SearXNG instances
        const instances = [
            'https://searx.be',
            'https://search.disroot.org',
            'https://searx.tiekoetter.com'
        ];
        
        // Select random instance
        const instance = instances[Math.floor(Math.random() * instances.length)];
        const searxUrl = `${instance}/search?q=${encodeURIComponent(query)}&pageno=${page}&format=json`;
        
        // Fetch from SearXNG
        const response = await fetch(searxUrl, {
            headers: {
                'User-Agent': 'Ymal-Search/1.0 (+https://search.ymal.space)',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`SearXNG responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Clean and format results
        const cleanResults = (data.results || []).map(result => ({
            title: result.title || '',
            url: result.url || '',
            content: result.content || '',
            engine: result.engine || 'web',
            score: result.score || 0,
            publishedDate: result.publishedDate || null
        }));
        
        // Return clean results
        return res.status(200).json({
            query: query,
            results: cleanResults,
            number_of_results: data.number_of_results || cleanResults.length,
            suggestions: data.suggestions || [],
            instance_used: instance
        });
        
    } catch (error) {
        console.error('Search error:', error);
        
        // Return fallback results
        return res.status(200).json({
            query: query,
            results: [],
            number_of_results: 0,
            suggestions: [],
            error: 'Search temporarily unavailable',
            fallback: true
        });
    }
}

// For Vercel serverless functions
export const config = {
    runtime: 'edge'
};
