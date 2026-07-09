'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  Unplug,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { configManager } from '@/lib/config/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Drawer } from './drawer';
import { GitHubAuthPanel } from '@/components/settings/github-auth-panel';
import { track } from '@/lib/telemetry';

export function GitHubConnectionsSection() {
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump((v) => v + 1), []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'connect' | 'edit' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const auth = configManager.getGitHubAuth();
  const isConnected = !!auth;

  useEffect(() => {
    const handleAuthUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.provider === 'github') {
        refresh();
      }
    };
    window.addEventListener('apiKeyUpdated', handleAuthUpdate);
    return () => window.removeEventListener('apiKeyUpdated', handleAuthUpdate);
  }, [refresh]);

  const handleDisconnect = () => {
    setIsLoading(true);
    try {
      configManager.clearGitHubAuth();
      toast.success('Disconnected from GitHub');
      track('connection_removed', { provider: 'github' });
      refresh();
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">GitHub</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Connected GitHub account for project export.
          </p>
        </div>
        {!isConnected && (
          <Button variant="default" size="sm" className="gap-1.5 shrink-0" onClick={() => { setDrawerMode('connect'); setDrawerOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Connect GitHub
          </Button>
        )}
      </div>

      {!isConnected ? (
        <p className="text-sm text-muted-foreground py-1 pl-1">None yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-card border border-border rounded-md px-4 py-3">
            <div className="w-[36px] h-[36px] rounded-md bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
              GH
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">GitHub</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {auth.username || 'Connected'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-semibold text-green-500 mr-1">Connected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7" title="Connection options" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => { setDrawerMode('edit'); setDrawerOpen(true); }}>
                    Edit Connection
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleDisconnect} className="text-destructive focus:text-destructive">
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        mode={drawerMode === 'connect' ? 'connect-config' : 'edit-config'}
        label={drawerMode === 'connect' ? 'Connect GitHub' : 'GitHub Connection'}
        title="GitHub"
        scope={isConnected ? `Authenticated as ${auth?.username}` : 'Connect your account'}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="px-[18px] py-4">
          <GitHubAuthPanel onAuthChange={() => { refresh(); setDrawerOpen(false); }} />
        </div>
      </Drawer>
    </div>
  );
}
