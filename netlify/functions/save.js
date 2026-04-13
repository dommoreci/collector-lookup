const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return { statusCode: 500, headers, body: JSON.stringify({ error: 'AIRTABLE_TOKEN not set' }) };

  try {
    const { baseId, table, fields } = JSON.parse(event.body || '{}');
    if (!baseId || !table || !fields) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };

    // Handle photo upload separately if present
    const airtableFields = { ...fields };
    
    // If photo is base64, upload as attachment
    if (fields.Photo && fields.Photo.startsWith('data:')) {
      // Convert base64 to blob via fetch data URL trick
      // Airtable requires a URL for attachments, so we'll use a filename approach
      // For now pass photo as-is and handle in the record
      delete airtableFields.Photo;
    }

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: airtableFields })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error' }) };
    
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

exports.handler = handler;
