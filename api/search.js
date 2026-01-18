addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  const page = url.searchParams.get('page') || '1'
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Use SearXNG instance
  const searxUrl = `https://searx.be/search?q=${encodeURIComponent(query)}&pageno=${page}&format=json`
  
  try {
    const response = await fetch(searxUrl)
    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Search failed',
      results: [],
      number_of_results: 0
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
