'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ConnectionBadge } from '@/components/settings/connection-badge';
import { toast } from 'sonner';
import { configManager } from '@/lib/config/storage';
import { validateApiKey } from '@/lib/llm/llm-client';
import { track } from '@/lib/telemetry';
import { checkHFCapabilities } from '@/lib/auth/hf-auth';

interface HFSpacesAuthPanelProps {
  onAuthChange?: () => void;
}

export function HFSpacesAuthPanel({ onAuthChange }: HFSpacesAuthPanelProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [envTokenAvailable, setEnvTokenAvailable] = useState(false);

  useEffect(() => {
    setIsConnected(!!configManager.getHFSpacesToken());
    checkHFCapabilities().then(caps => {
      setEnvTokenAvailable(caps.hfSpacesTokenAvailable);
    });
  }, []);

  const handleConnect = async () => {
    const key = tokenInput.trim();
    if (!key) {
      toast.error('Please enter an access token');
      return;
    }
    setIsConnecting(true);
    try {
      // HF Space deployment requires 'write' scope, while LLM inference requires 'read' or 'inference' scope.
      // We still use validateApiKey to check if the token is at least valid on HF,
      // though it might not specifically check for 'write' scope here.
      const isValid = await validateApiKey(key, 'huggingface');
      if (isValid) {
        configManager.setHFSpacesToken(key);
        setIsConnected(true);
        setTokenInput('');
        toast.success('Hugging Face Space deployment token saved');
        track('hf_spaces_token_added');
        onAuthChange?.();
      } else {
        toast.error('Invalid token. Check that it is correct.');
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
      configManager.setHFSpacesToken('');
      setIsConnected(false);
      setTokenInput('');
      toast.success('Hugging Face Space deployment token removed');
      track('hf_spaces_token_removed');
      onAuthChange?.();
    } catch {
      toast.error('Failed to remove token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected || envTokenAvailable) {
    const storedToken = configManager.getHFSpacesToken();
    return (
      <div className="space-y-3">
        <ConnectionBadge
          method={storedToken ? "API Key (Write)" : "Environment Variable"}
          extra={storedToken ? `···${storedToken.slice(-4)}` : "HF_TOKEN"}
          info={storedToken ? "Ready for Space deployments" : "Using HF_TOKEN from environment"}
          onDisconnect={storedToken ? handleDisconnect : undefined}
          disconnecting={isLoading}
        />
        {envTokenAvailable && !storedToken && (
           <p className="text-xs text-muted-foreground italic">
             A token provided in the UI will take precedence over the environment variable.
           </p>
        )}
        {!storedToken && (
           <Button variant="outline" size="sm" onClick={() => setIsConnected(false)} className="w-full">
             Override with new token
           </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Hugging Face Space Deployment</Label>
      <p className="text-xs text-muted-foreground">
        Provide a Hugging Face access token with <b>write</b> scope to deploy your projects to Spaces.
      </p>

      <div>
        <Label htmlFor="hf-spaces-token" className="text-xs">Access Token (Write Scope)</Label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Input
              id="hf-spaces-token"
              type={showToken ? 'text' : 'password'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && tokenInput.trim()) handleConnect(); }}
              placeholder="hf_..."
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
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      <div className="p-3 border rounded-md bg-muted/50 text-xs text-muted-foreground space-y-2">
        <p className="font-medium">How to get a write token:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Go to{' '}
            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              huggingface.co/settings/tokens <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </li>
          <li>Create a new token (Fine-grained or Classic)</li>
          <li>Ensure it has <b>Write</b> access to your repos/Spaces</li>
          <li>Paste the token above and click Save</li>
        </ol>
      </div>
    </div>
  );
}
