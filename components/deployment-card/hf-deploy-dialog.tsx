'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Rocket, ExternalLink, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { configManager } from '@/lib/config/storage';
import { logger } from '@/lib/utils';

interface HFDeployDialogProps {
  deploymentId: string;
  deploymentName: string;
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export function HFDeployDialog({
  deploymentId,
  deploymentName,
  isOpen,
  onClose,
  workspaceId,
}: HFDeployDialogProps) {
  const [spaceName, setSpaceName] = useState(() => deploymentName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  const [organization, setOrganization] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<'idle' | 'pushing' | 'building' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [spaceUrl, setSpaceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDeploy = async () => {
    const token = configManager.getHFSpacesToken();
    if (!token) {
      toast.error('Hugging Face Space token not found. Please add it in Settings > Connections.');
      return;
    }

    setIsDeploying(true);
    setDeployStep('pushing');
    setLogs(['[OSW] Starting deployment to Hugging Face Space...', `[OSW] Space: ${organization ? `${organization}/${spaceName}` : spaceName}`]);
    setError(null);

    try {
      const apiBase = workspaceId ? `/api/w/${workspaceId}` : '/api';
      const response = await fetch(`${apiBase}/deployments/${deploymentId}/hf-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceName, organization, token }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to deploy');

      setSpaceUrl(result.spaceUrl);
      setDeployStep('building');
      setLogs(prev => [...prev, '[OSW] Files pushed successfully. Waiting for build logs...']);

      // Start streaming logs
      const repoId = organization ? `${organization}/${spaceName}` : spaceName;
      const eventSource = new EventSource(`${apiBase}/deployments/${deploymentId}/hf-deploy/logs?repoId=${repoId}&token=${token}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg) {
            setLogs(prev => [...prev, data.msg]);
          } else if (typeof data === 'string') {
            setLogs(prev => [...prev, data]);
          }
        } catch {
          if (event.data) {
            setLogs(prev => [...prev, event.data]);
          }
        }
      };

      eventSource.addEventListener('error', (event: any) => {
        const data = JSON.parse(event.data || '{}');
        if (data.message) {
          setLogs(prev => [...prev, `[ERROR] ${data.message}`]);
          if (data.type === 'build' || data.type === 'run') {
            // Some errors are transient, but if it's a hard error we might want to stop
          }
        }
      });

      // Simple completion heuristic: look for successful build messages
      // HF Space logs don't always have a clear "done" event, so we might just let the user watch.
      // For this demo, we'll keep it simple.

      // We can also poll HF API for status if needed, but streaming logs is the requirement.

    } catch (err: any) {
      logger.error('[HFDeploy] Deployment failed:', err);
      setError(err.message);
      setDeployStep('error');
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isDeploying ? undefined : onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Deploy to Hugging Face Space</DialogTitle>
          <DialogDescription>
            This will push your project to a Hugging Face Space with a Docker environment.
          </DialogDescription>
        </DialogHeader>

        {deployStep === 'idle' ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="org" className="text-right text-xs">Organization</Label>
              <Input
                id="org"
                placeholder="Optional (defaults to username)"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="col-span-3 h-8"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-xs">Space Name</Label>
              <Input
                id="name"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                className="col-span-3 h-8"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
             <div className="flex items-center gap-2">
                {deployStep === 'pushing' || deployStep === 'building' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : deployStep === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {deployStep === 'pushing' && 'Pushing files to Hugging Face...'}
                  {deployStep === 'building' && 'Building Space on Hugging Face...'}
                  {deployStep === 'done' && 'Deployment Complete!'}
                  {deployStep === 'error' && 'Deployment Failed'}
                </span>
             </div>

             <div
              ref={scrollRef}
              className="bg-black text-green-400 font-mono text-[10px] p-3 rounded h-64 overflow-auto whitespace-pre-wrap"
             >
               {logs.length === 0 ? 'Initializing logs...' : logs.join('\n')}
             </div>

             {spaceUrl && (
               <Button variant="outline" className="w-full gap-2" onClick={() => window.open(spaceUrl, '_blank')}>
                 View on Hugging Face <ExternalLink className="h-4 w-4" />
               </Button>
             )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          {deployStep === 'idle' ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleDeploy} className="gap-2">
                <Rocket className="h-4 w-4" />
                Deploy Now
              </Button>
            </>
          ) : (
            <Button variant={deployStep === 'error' ? 'destructive' : 'default'} onClick={onClose} disabled={isDeploying}>
              {deployStep === 'done' ? 'Close' : 'Close Panel'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
