/**
 * Hugging Face Space Deployment API
 *
 * POST - Build and push a deployment to a Hugging Face Space
 */

import { logger } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { buildStaticDeployment } from '@/lib/compiler/static-builder';
import { getWorkspaceContext } from '@/lib/api/workspace-context';
import { createRepo, uploadFiles } from '@huggingface/hub';
import path from 'path';
import { promises as fs } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const { workspaceId } = await getWorkspaceContext(params);
    const { id: deploymentId } = await params;
    const body = await request.json();
    const { spaceName, organization, token: uiToken } = body;

    if (!spaceName) {
      return NextResponse.json({ error: 'Space name is required' }, { status: 400 });
    }

    // Auth token resolution: UI value > env var
    const token = uiToken || process.env.HF_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Hugging Face access token is required' }, { status: 401 });
    }

    // 1. Build the deployment locally first to get the static files
    const buildResult = await buildStaticDeployment(deploymentId, workspaceId);
    if (!buildResult.success) {
      return NextResponse.json({ error: buildResult.error || 'Failed to build deployment' }, { status: 500 });
    }

    const repoId = organization ? `${organization}/${spaceName}` : spaceName;

    // 2. Create or ensure Space exists (sdk: docker)
    try {
      await createRepo({
        repo: { type: 'space', name: repoId },
        sdk: 'docker',
        token,
      });
      logger.info(`[HF Deploy] Created Space: ${repoId}`);
    } catch (err: any) {
      // 409 Conflict means it already exists, which is fine
      if (err.status !== 409) {
        logger.error(`[HF Deploy] Failed to create Space ${repoId}:`, err);
        return NextResponse.json({ error: `Failed to create/access Space: ${err.message}` }, { status: 500 });
      }
      logger.info(`[HF Deploy] Using existing Space: ${repoId}`);
    }

    // 3. Prepare files for upload
    const outputDir = path.join(process.cwd(), 'public', 'deployments', deploymentId);
    const files = await getAllFiles(outputDir);

    // Add a Dockerfile to serve the static content
    const dockerfileContent = `FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 7860
# Hugging Face Spaces run on port 7860
RUN sed -i 's/listen       80;/listen       7860;/g' /etc/nginx/conf.d/default.conf
`;

    const uploadOps = await Promise.all(files.map(async (f) => {
      const relativePath = path.relative(outputDir, f);
      const content = await fs.readFile(f);
      return {
        path: relativePath,
        content: new Blob([content]),
      };
    }));

    uploadOps.push({
      path: 'Dockerfile',
      content: new Blob([dockerfileContent]),
    });

    // 4. Upload to Hugging Face
    await uploadFiles({
      repo: { type: 'space', name: repoId },
      files: uploadOps,
      token,
      commitTitle: 'Deploy from OSW Studio',
    });

    logger.info(`[HF Deploy] Successfully pushed to ${repoId}`);

    return NextResponse.json({
      success: true,
      repoId,
      spaceUrl: `https://huggingface.co/spaces/${repoId}`,
    });

  } catch (error) {
    logger.error('[HF Deploy API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy to HF Space' },
      { status: 500 }
    );
  }
}

async function getAllFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getAllFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}
