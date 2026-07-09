'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ConnectionBadge } from '@/components/settings/connection-badge';
import { toast } from 'sonner';
import { configManager } from '@/lib/config/storage';
import { track } from '@/lib/telemetry';
import { apiFetch } from '@/lib/api/backend-status';

interface GitHubAuthPanelProps {
  onAuthChange?: () => void;
}

export function GitHubAuthPanel({ onAuthChange }: GitHubAuthPanelProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(() => !!configManager.getGitHubAuth());
  const [username, setUsername] = useState<string | undefined>(() => configManager.getGitHubAuth()?.username);

  const dispatchAuthEvent = useCallback((hasKey: boolean) => {
    onAuthChange?.();
    window.dispatchEvent(new CustomEvent('apiKeyUpdated', {
      detail: { provider: 'github', hasKey }
    }));
  }, [onAuthChange]);

  useEffect(() => {
    const handleAuthUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.provider === 'github') {
        const auth = configManager.getGitHubAuth();
        setIsConnected(detail.hasKey);
        if (auth?.username) setUsername(auth.username);
      }
    };
    window.addEventListener('apiKeyUpdated', handleAuthUpdate);
    return () => window.removeEventListener('apiKeyUpdated', handleAuthUpdate);
  }, []);

  const handleConnect = async () => {
    const key = tokenInput.trim();
    if (!key) {
      toast.error('Please enter a Personal Access Token');
      return;
    }
    setIsConnecting(true);
    try {
      const response = await apiFetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, provider: 'github' })
      });

      if (response.ok) {
        const { valid, username: githubUsername } = await response.json();
        if (valid) {
          configManager.setGitHubAuth({ access_token: key, username: githubUsername });
          setIsConnected(true);
          setUsername(githubUsername);
          setTokenInput('');
          toast.success(`Connected to GitHub as ${githubUsername}`);
          track('connection_added', { provider: 'github' });
          dispatchAuthEvent(true);
        } else {
          toast.error('Invalid token. Check that it has "repo" scope.');
        }
      } else {
        toast.error('Failed to validate token');
      }
    } catch {
      toast.error('Failed to validate token. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsLoading(true);
    try {
      configManager.clearGitHubAuth();
      setIsConnected(false);
      setUsername(undefined);
      setTokenInput('');
      toast.success('Disconnected from GitHub');
      track('connection_removed', { provider: 'github' });
      dispatchAuthEvent(false);
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="space-y-3">
        <ConnectionBadge
          method="Personal Access Token"
          extra={username}
          info={
            <>
              Authenticated as {username}.{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Manage Tokens <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </>
          }
          onDisconnect={handleDisconnect}
          disconnecting={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>GitHub Authentication</Label>
      <p className="text-xs text-muted-foreground">
        Connect your GitHub account to export projects directly to repositories.
      </p>

      <div>
        <Label htmlFor="gh-token" className="text-xs">Personal Access Token</Label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Input
              id="gh-token"
              type={showToken ? 'text' : 'password'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && tokenInput.trim()) handleConnect(); }}
              placeholder="ghp_..."
              className="pr-10"
              disabled={isConnecting}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !tokenInput.trim()}
            size="sm"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </div>
      </div>

      <div className="p-3 border rounded-md bg-muted/50 text-xs text-muted-foreground space-y-2">
        <p className="font-medium">How to get a Personal Access Token:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Go to{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              GitHub Token Settings <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </li>
          <li>Generate a new token (classic or fine-grained)</li>
          <li>Ensure it has <strong>repo</strong> scope (full control of private repositories)</li>
          <li>Paste the token above and click Connect</li>
        </ol>
      </div>
    </div>
  );
}
