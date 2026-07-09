import { logger } from '@/lib/utils';

export interface GitHubRepo {
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
}

export interface GitHubFile {
  path: string;
  content: string; // Base64 encoded for binary or UTF-8 string for text
  encoding: 'base64' | 'utf-8';
}

export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getUser() {
    return this.request('/user');
  }

  async createRepo(name: string, isPrivate: boolean) {
    return this.request('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: false,
      }),
    });
  }

  async getRepo(owner: string, name: string): Promise<GitHubRepo> {
    return this.request(`/repos/${owner}/${name}`);
  }

  /**
   * Push multiple files to a repository in a single commit using the Git Data API.
   */
  async pushFiles(owner: string, repo: string, branch: string, message: string, files: GitHubFile[]) {
    // 1. Get the latest commit on the branch
    let baseTreeSha: string | undefined;
    let parentCommitSha: string | undefined;

    try {
      const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      parentCommitSha = ref.object.sha;
      const commit = await this.request(`/repos/${owner}/${repo}/git/commits/${parentCommitSha}`);
      baseTreeSha = commit.tree.sha;
    } catch (e) {
      // Branch might not exist if it's a new repo
      logger.debug(`[GitHubClient] Branch ${branch} not found or error, assuming new repo:`, e);
    }

    // 2. Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const blob = await this.request(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding,
          }),
        });
        return {
          path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        };
      })
    );

    // 3. Create a new tree
    const tree = await this.request(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    // 4. Create a commit
    const commit = await this.request(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: parentCommitSha ? [parentCommitSha] : [],
      }),
    });

    // 5. Update the reference
    return this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: parentCommitSha ? 'PATCH' : 'POST',
      body: JSON.stringify({
        sha: commit.sha,
        force: true, // Should be true if it's the initial commit or if we want to overwrite
        ...(parentCommitSha ? {} : { ref: `refs/heads/${branch}` })
      }),
    });
  }
}
