/**
 * Endpoint testing script for deployed Hugging Face Space.
 * Calls /health, /api-docs, /, /api/models, and /api/generate endpoints
 * and records response details.
 */

const spaceUrl = process.env.HF_SPACE_URL || 'https://leon4gr45-builder.hf.space';
const token = process.env.HF_TOKEN || '';

console.log(`Target Space URL: ${spaceUrl}`);
console.log(`Hugging Face Token: ${token ? 'Provided (hidden)' : 'Not Provided'}`);

const headers = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

async function testEndpoint(name, path, method = 'GET', body = null) {
  const url = `${spaceUrl.replace(/\/$/, '')}${path}`;
  console.log(`\n========================================`);
  console.log(`Test: ${name}`);
  console.log(`URL: ${url} (${method})`);
  if (body) {
    console.log(`Request Body: ${JSON.stringify(body, null, 2)}`);
  }

  const fetchOptions = {
    method,
    headers: {
      ...headers,
    },
  };

  if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const startTime = Date.now();
  try {
    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const text = await response.text();
    let isJson = false;
    let jsonContent = null;
    try {
      jsonContent = JSON.parse(text);
      isJson = true;
    } catch (e) {
      // Not JSON
    }

    if (isJson) {
      console.log(`Response JSON:\n${JSON.stringify(jsonContent, null, 2)}`);
      return {
        name,
        path,
        method,
        status: response.status,
        ok: response.ok,
        duration,
        isJson,
        data: jsonContent
      };
    } else {
      const truncatedText = text.length > 500 ? text.substring(0, 500) + '... (truncated)' : text;
      console.log(`Response Text:\n${truncatedText}`);
      return {
        name,
        path,
        method,
        status: response.status,
        ok: response.ok,
        duration,
        isJson,
        data: truncatedText
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Error executing test ${name}:`, error.message);
    return {
      name,
      path,
      method,
      status: 0,
      ok: false,
      duration,
      error: error.message
    };
  }
}

async function runAllTests() {
  const results = [];

  // 1. GET /health
  results.push(await testEndpoint('Health Check', '/health', 'GET'));

  // 2. GET /api-docs
  results.push(await testEndpoint('API Documentation', '/api-docs', 'GET'));

  // 3. GET /
  results.push(await testEndpoint('Frontend Main Page', '/', 'GET'));

  // 4. POST /api/models - with an invalid api key
  results.push(await testEndpoint('Models List (Invalid Key / openrouter)', '/api/models', 'POST', {
    provider: 'openrouter',
    apiKey: 'invalid-key-test'
  }));

  // 5. POST /api/models - with openai and invalid api key
  results.push(await testEndpoint('Models List (Invalid Key / openai)', '/api/models', 'POST', {
    provider: 'openai',
    apiKey: 'sk-invalidkeytest'
  }));

  // 6. POST /api/generate - prompt payload example
  results.push(await testEndpoint('Generate API Endpoint (Unauthorized/Invalid Key)', '/api/generate', 'POST', {
    prompt: 'Create a simple landing page',
    model: 'gemini-2.0-flash',
    provider: 'google',
    stream: false
  }));

  console.log(`\n========================================`);
  console.log(`All tests complete!`);
  console.log(`Results summary:`);
  results.forEach(r => {
    console.log(`- ${r.name}: ${r.ok ? '✅ SUCCESS' : '❌ FAILED'} (${r.status ? `Status ${r.status}` : `Error: ${r.error}`})`);
  });

  // Export results for further usage
  const fs = require('fs');
  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Results saved to test_results.json`);
}

runAllTests();
