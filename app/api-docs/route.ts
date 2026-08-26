import { NextResponse } from 'next/server';

const API_DOCUMENTATION = {
  name: 'OSW Studio API Documentation',
  version: '1.84.0',
  description: 'API endpoints documentation for OSW Studio running on Hugging Face Spaces',
  endpoints: [
    {
      path: '/health',
      method: 'GET',
      purpose: 'Health check endpoint returning HTTP 200 when app is ready.',
      request: null,
      response: {
        ok: true,
        name: 'osw-studio',
        version: '1.84.0',
        mode: 'browser',
        timestamp: '2026-07-16T12:00:00.000Z',
      },
    },
    {
      path: '/api-docs',
      method: 'GET',
      purpose: 'Serve API documentation of all available routes.',
      request: null,
      response: 'JSON documentation object',
    },
    {
      path: '/api/models',
      method: 'GET',
      purpose: 'List available AI models across supported providers.',
      request: null,
      response: { models: [] },
    },
    {
      path: '/api/validate-key',
      method: 'POST',
      purpose: 'Validate an AI provider API key.',
      request: { provider: 'openrouter', apiKey: 'sk-...' },
      response: { valid: true },
    },
    {
      path: '/api/generate',
      method: 'POST',
      purpose: 'Generate web code or site response via AI model.',
      request: { prompt: 'Create a landing page', provider: 'openrouter', model: '...' },
      response: { result: '...' },
    },
    {
      path: '/api/generate-image',
      method: 'POST',
      purpose: 'Generate image assets using AI image generation service.',
      request: { prompt: 'Logo design' },
      response: { url: '...' },
    },
    {
      path: '/api/web/search',
      method: 'POST',
      purpose: 'Perform web search for context retrieval.',
      request: { query: 'Next.js 15 features' },
      response: { results: [] },
    },
    {
      path: '/api/web/fetch',
      method: 'POST',
      purpose: 'Fetch web content from external URL.',
      request: { url: 'https://example.com' },
      response: { content: '...' },
    },
  ],
};

export async function GET() {
  return NextResponse.json(API_DOCUMENTATION, { status: 200 });
}
