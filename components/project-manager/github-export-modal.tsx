'use client';

import React, { useState } from 'react';
import { Project } from '@/lib/vfs/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { configManager } from '@/lib/config/storage';
import { apiFetch } from '@/lib/api/backend-status';
import { Loader2, Github, ExternalLink } from 'lucide-react';
import { vfs } from '@/lib/vfs';
import { arrayBufferToBase64 } from '@/lib/vfs/binary-encoding';

interface GitHubExportModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (project: Project) => void;
}

export function GitHubExportModal({ project, open, onOpenChange, onSuccess }: GitHubExportModalProps) {
  const [repoName, setRepoName] = useState(() => project.settings.githubRepo?.name || project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const [isPrivate, setIsPrivate] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const auth = configManager.getGitHubAuth();
  const isConnected = !!auth;

  const handleExport = async () => {
    if (!isConnected) {
      toast.error('GitHub not connected. Please connect in Settings > Connections.');
      return;
    }

    setIsExporting(true);
    try {
      // 1. Get all project files
      const allFilesAndDirs = await vfs.getAllFilesAndDirectories(project.id);
      const files = allFilesAndDirs.filter(f => (f as any).type !== 'directory');

      const githubFiles = await Promise.all(files.map(async (f: any) => {
        const file = await vfs.readFile(project.id, f.path);
        const isBinary = file.content instanceof ArrayBuffer;

        return {
          path: file.path,
          content: isBinary ? arrayBufferToBase64(file.content as ArrayBuffer) : file.content as string,
          encoding: isBinary ? 'base64' as const : 'utf-8' as const
        };
      }));

      // 2. Call export API
      const response = await apiFetch('/api/github/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: auth.access_token,
          owner: project.settings.githubRepo?.owner,
          repo: project.settings.githubRepo?.name,
          name: repoName,
          isPrivate,
          files: githubFiles,
          message: project.settings.githubRepo ? 'Update from OSW Studio' : 'Initial commit from OSW Studio'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const updatedProject = {
            ...project,
            settings: {
              ...project.settings,
              githubRepo: data.repo
            }
          };
          await vfs.updateProject(updatedProject);
          toast.success(project.settings.githubRepo ? 'Project updated on GitHub!' : 'Project exported to GitHub!');
          onSuccess(updatedProject);
          onOpenChange(false);
        } else {
          toast.error(data.error || 'Export failed');
        }
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to export to GitHub');
      }
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            {project.settings.githubRepo ? 'Update on GitHub' : 'Export to GitHub'}
          </DialogTitle>
          <DialogDescription>
            {project.settings.githubRepo
              ? `Push current files to ${project.settings.githubRepo.full_name}.`
              : 'Create a new repository and push your project files.'}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">You need to connect your GitHub account first.</p>
            <Button variant="outline" onClick={() => { onOpenChange(false); /* Should navigate or open settings */ }}>
              Go to Connections
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {project.settings.githubRepo ? (
              <div className="p-3 border rounded-md bg-muted/50 text-sm space-y-1">
                <p className="font-medium">Linked Repository</p>
                <a
                  href={project.settings.githubRepo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {project.settings.githubRepo.full_name} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="repo-name">Repository Name</Label>
                  <Input
                    id="repo-name"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="my-awesome-project"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="repo-visibility">Private Repository</Label>
                    <p className="text-xs text-muted-foreground">
                      Only you and people you choose can see this repository.
                    </p>
                  </div>
                  <Switch
                    id="repo-visibility"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          {isConnected && (
            <Button onClick={handleExport} disabled={isExporting || (!project.settings.githubRepo && !repoName)}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {project.settings.githubRepo ? 'Updating...' : 'Exporting...'}
                </>
              ) : (
                project.settings.githubRepo ? 'Push Update' : 'Create & Export'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
