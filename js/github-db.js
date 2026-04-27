/* GitHub REST API wrapper - reads/writes JSON files as the database */
class GitHubDB {
  constructor() {
    this.config = this._loadConfig();
    this._cache = {}; // path -> { content, sha }
  }

  _loadConfig() {
    try {
      const raw = localStorage.getItem('wmm-gh-config');
      return raw ? JSON.parse(raw) : { owner: '', repo: '', branch: 'main', token: '' };
    } catch {
      return { owner: '', repo: '', branch: 'main', token: '' };
    }
  }

  saveConfig(cfg) {
    this.config = cfg;
    localStorage.setItem('wmm-gh-config', JSON.stringify(cfg));
  }

  isConfigured() {
    const { owner, repo, token } = this.config;
    return !!(owner && repo && token);
  }

  _headers() {
    return {
      'Authorization': `token ${this.config.token}`,
      'Accept':        'application/vnd.github.v3+json',
      'Content-Type':  'application/json',
    };
  }

  /* Read a JSON file from the repo. Returns { content, sha } or null if not found. */
  async readFile(path) {
    const { owner, repo, branch } = this.config;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers: this._headers() });

    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API ${res.status}`);
    }

    const data = await res.json();
    // GitHub returns base64 with embedded newlines
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    const content = JSON.parse(decoded);
    this._cache[path] = { content, sha: data.sha };
    return { content, sha: data.sha };
  }

  /* Write (create or update) a JSON file. Handles sha automatically. */
  async writeFile(path, content, message) {
    const { owner, repo, branch } = this.config;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Resolve sha: prefer cache, then fetch live
    let sha = this._cache[path]?.sha ?? null;
    if (!sha) {
      const existing = await this.readFile(path);
      sha = existing?.sha ?? null;
    }

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
    const body = { message: message || `Update ${path}`, content: encoded, branch };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API ${res.status}`);
    }

    const result = await res.json();
    // Update cache with new sha
    this._cache[path] = { content, sha: result.content.sha };
    return result;
  }

  /* Verify credentials and repo access */
  async testConnection() {
    const { owner, repo } = this.config;
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: this._headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Cannot access ${owner}/${repo}`);
    }
    return await res.json();
  }
}

const db = new GitHubDB();
