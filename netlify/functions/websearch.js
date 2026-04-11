const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({}) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({}) };
  }

  try {
    const { itemName, condLabel } = JSON.parse(event.body || '{}');
    const searchPrompt = `Search the web for the lowest current asking price for: "${itemName}" (condition: ${condLabel}). Search eBay active listings, Mercari, and other marketplaces. Find the single lowest Buy It Now price currently listed (not sold — active only). Respond ONLY with valid JSON: {"lowest_price": dollar integer or null, "lowest_source": "site name", "lowest_url": "direct URL", "lowest_title": "listing title", "search_summary": "one sentence"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: searchPrompt }]
      })
    });

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    let result = {};
    if (text) {
      try { result = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch {}
    }
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({}) };
  }
};

exports.handler = handler;
