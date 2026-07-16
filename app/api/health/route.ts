import { NextResponse } from 'next/server';

const ENDPOINT_GROUPS = {
  health: ['/api/health'],
  auth: [
    '/api/auth/check',
    '/api/auth/setup-status',
    '/api/auth/me',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/register',
    '/api/auth/hf/capabilities',
    '/api/auth/codex/status',
  ],
  public: [
    '/api/models',
    '/api/validate-key',
    '/api/generate',
    '/api/generate-image',
    '/api/docs/[...path]',
    '/api/web/fetch',
    '/api/web/search',
    '/api/resolve-domain',
  ],
  analytics: [
    '/api/analytics/track',
    '/api/analytics/interaction',
    '/api/analytics/[deploymentId]',
    '/api/analytics/[deploymentId]/overview',
    '/api/analytics/[deploymentId]/sessions',
    '/api/analytics/[deploymentId]/engagement',
    '/api/analytics/[deploymentId]/heatmap',
    '/api/analytics/[deploymentId]/storage',
    '/api/analytics/[deploymentId]/export',
    '/api/analytics/[deploymentId]/clear',
  ],
  serverMode: [
    '/api/admin/dashboard',
    '/api/admin/users',
    '/api/admin/workspaces',
    '/api/workspaces',
    '/api/server-generate',
    '/api/server-generate/events',
    '/api/server-generate/status',
    '/api/w/[workspaceId]/projects',
    '/api/w/[workspaceId]/deployments',
    '/api/w/[workspaceId]/sync/status',
    '/api/w/[workspaceId]/shell/execute',
  ],
};

export async function GET() {
  const serverMode = process.env.NEXT_PUBLIC_SERVER_MODE === 'true';
  return NextResponse.json({
    ok: true,
    name: 'osw-studio',
    version: process.env.npm_package_version ?? 'unknown',
    mode: serverMode ? 'server' : 'browser',
    timestamp: new Date().toISOString(),
    endpoints: ENDPOINT_GROUPS,
  });
}
