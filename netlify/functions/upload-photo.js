const crypto = require('crypto');

const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Cloudinary credentials not configured' }) };
  }

  try {
    const { imageBase64, mimeType, folder } = JSON.parse(event.body || '{}');
    if (!imageBase64) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No image provided' }) };

    const timestamp = Math.round(Date.now() / 1000);
    const folderName = folder || 'collector-app';

    // Generate signature
    const sigStr = `folder=${folderName}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(sigStr).digest('hex');

    // Build form data for Cloudinary
    const formData = new URLSearchParams();
    formData.append('file', `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folderName);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'Upload failed' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: data.secure_url, publicId: data.public_id })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

exports.handler = handler;
