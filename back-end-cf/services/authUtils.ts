import { sha256, secureEqual, hmacSha256 } from './utils';
import { downloadFile } from './fileMethods';
import type { TokenScope } from '../types/apiType';

async function authenticatePost(env: Env, path: string, passwd?: string): Promise<boolean> {
  const normPath = path === '/' ? '' : (path.endsWith('/') ? path.slice(0, -1) : path);
  const pathParts = normPath.split('/').filter(Boolean);

  if (env.PASSWORD && passwd && secureEqual(passwd, env.PASSWORD)) {
    return true;
  }

  const candidatePaths: string[] = [];
  let current = '';
  candidatePaths.push('');
  for (const part of pathParts) {
    current += '/' + part;
    candidatePaths.push(current);
  }
  candidatePaths.reverse();

  const hashedPasswd = await sha256(passwd || '');

  for (const p of candidatePaths) {
    const fullPath = `${p}/${env.PROTECTED.PASSWD_FILENAME}`.replace(/\/+/g, '/');
    const resp = await downloadFile(fullPath, true);

    if (resp.status === 200 || resp.status === 302) {
      const pwFileContent = await resp.text();
      const trimmedContent = pwFileContent.trim().toLowerCase();

      if (trimmedContent.length > 0) {
        if (passwd && secureEqual(hashedPasswd, trimmedContent)) {
          return true;
        } else {
          return false;
        }
      }
    }
  }

  return true;
}

export function authenticateWebdav(
  davAuthHeader: string | null,
  USERNAME: string | undefined,
  PASSWORD: string | undefined,
): boolean {
  if (!davAuthHeader || !USERNAME || !PASSWORD) {
    return false;
  }

  return secureEqual(davAuthHeader, `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`);
}

async function getTokenScopes(
  secret: string | undefined,
  reqPath: string,
  searchParams: URLSearchParams,
): Promise<TokenScope[]> {
  const token = searchParams.get('token')?.toLowerCase();
  if (!token || !secret) {
    return [];
  }

  const tokenScope = searchParams.get('ts') || 'download';
  const expires = searchParams.get('te');
  const authPath = searchParams.get('tb') ?? '/';
  const tokenArgString = [tokenScope, expires].filter(Boolean).join(',');

  const candidatePaths = new Set<string>();
  candidatePaths.add(reqPath);

  if (expires) {
    const now = Math.floor(Date.now() / 1000);
    const exp = parseInt(expires);
    if (isNaN(exp) || now > exp) {
      return [];
    }
  }

  if (tokenScope.includes('children') || tokenScope === 'download') {
    const beginPath = reqPath.split('/').slice(0, -1).join('/') || '/';
    candidatePaths.add(beginPath);
  }

  if (tokenScope.includes('recursive')) {
    if (reqPath.startsWith(authPath)) {
      candidatePaths.add(authPath);
    }
  }

  for (const p of candidatePaths) {
    const expectedSign = await hmacSha256(secret, `${p},${tokenArgString}`);
    if (token === expectedSign) {
      return tokenScope.split(',').sort() as TokenScope[];
    }
  }

  return [];
}

interface AuthContext {
  env: Env;
  url: URL;
  passwd?: string;
  postPath?: string;
}

export async function authorizeActions(
  actions: readonly TokenScope[],
  ctx: AuthContext,
): Promise<Set<TokenScope>> {
  const allowed = new Set<TokenScope>();
  const { env, url, passwd, postPath } = ctx;
  const publicActions: TokenScope[] = ['list', 'download'];

  const path = postPath || url.searchParams.get('file') || decodeURIComponent(url.pathname);
  const tokenScopes = await getTokenScopes(env.PASSWORD, path, url.searchParams);

  for (const action of actions) {
    if (action !== 'list') {
      if (env.PROTECTED.REQUIRE_AUTH !== true && publicActions.includes(action)) {
        allowed.add(action);
        continue;
      }

      if (tokenScopes.includes(action)) {
        allowed.add(action);
        continue;
      }
    }

    let ok = false;
    // if passwd null/undefined, this auth path is skipped to improve performance
    switch (action) {
      case 'download':
        ok = authenticateWebdav(passwd ?? null, env.USERNAME, env.PASSWORD);
        break;

      case 'list':
        // For list action, we ALWAYS check for .password files regardless of REQUIRE_AUTH
        ok = await authenticatePost(env, path, passwd);
        break;

      case 'upload':
        ok =
          (await authenticatePost(env, path, passwd)) &&
          (await downloadFile(`${path}/.upload`)).status === 302;
        break;
    }

    if (ok) allowed.add(action);
  }

  return allowed;
}
