import { describe, it, expect } from 'vitest';
import { getProvider, getDefaultModel } from '../registry';

describe('freebuff provider integration', () => {
  it('registers freebuff provider correctly', () => {
    const provider = getProvider('freebuff');
    expect(provider).toBeDefined();
    expect(provider.id).toBe('freebuff');
    expect(provider.name).toBe('freebuff');
    expect(provider.apiKeyRequired).toBe(false);
    expect(provider.isLocal).toBe(true);
    expect(provider.supportsStreaming).toBe(true);
    expect(provider.supportsFunctions).toBe(true);
  });

  it('returns default model for freebuff provider', () => {
    const defaultModel = getDefaultModel('freebuff');
    expect(defaultModel).toBe('freebuff-coder');
  });
});
