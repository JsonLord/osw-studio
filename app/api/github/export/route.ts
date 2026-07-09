import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github/client';
import { logger } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { token, owner, repo, name, isPrivate, branch = 'main', message, files } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 });
    }

    const client = new GitHubClient(token);

    let targetOwner = owner;
    let targetRepo = repo;

    // 1. Create repo if it doesn't exist
    if (!targetOwner || !targetRepo) {
      try {
        const user = await client.getUser();
        targetOwner = user.login;
        targetRepo = name;

        try {
          await client.getRepo(targetOwner, targetRepo);
          // Repo exists, we'll just push to it
        } catch (e) {
          // Repo doesn't exist, create it
          await client.createRepo(targetRepo, isPrivate);
        }
      } catch (error: any) {
        return NextResponse.json({ error: `Failed to prepare repository: ${error.message}` }, { status: 500 });
      }
    }

    // 2. Push files
    try {
      await client.pushFiles(targetOwner, targetRepo, branch, message || 'Initial commit from OSW Studio', files);

      const repoInfo = await client.getRepo(targetOwner, targetRepo);

      return NextResponse.json({
        success: true,
        repo: {
          owner: targetOwner,
          name: targetRepo,
          full_name: repoInfo.full_name,
          html_url: repoInfo.html_url
        }
      });
    } catch (error: any) {
      logger.error('[GitHub Export] Push failed:', error);
      return NextResponse.json({ error: `Failed to push files: ${error.message}` }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('[GitHub Export] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
