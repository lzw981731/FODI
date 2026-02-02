import type { DavRes } from '../types/apiType';
import { runtimeEnv } from '../types/env';
import { authenticateWebdav } from '../services/authUtils';
import { davClient } from '../services/davMethods';
import { parsePath } from '../services/pathUtils';
import { parseDepth } from '../services/davUtils';

export async function handleWebdav(request: Request, env: Env, requestUrl: URL): Promise<Response> {
  const isdavAuthorized = authenticateWebdav(
    request.headers.get('Authorization'),
    env.USERNAME,
    env.PASSWORD,
  );
  if (!isdavAuthorized) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="WebDAV"' },
    });
  }

  const proxyKeyword = env.PROXY_KEYWORD || env.PROTECTED.PROXY_KEYWORD;
  const isUrlProxy = proxyKeyword.startsWith('http');
  const proxyPrefix = isUrlProxy ? new URL(proxyKeyword).pathname : `/${proxyKeyword}`;

  const isProxyRequest = !!(
    proxyKeyword &&
    (isUrlProxy
      ? requestUrl.href.startsWith(proxyKeyword)
      : requestUrl.pathname.startsWith(proxyPrefix))
  );

  const filePath = parsePath(
    decodeURIComponent(requestUrl.pathname),
    isProxyRequest ? proxyPrefix : undefined,
    true,
  ).path;
  const destination = parsePath(
    decodeURIComponent(request.headers.get('Destination') || ''),
    isProxyRequest ? proxyPrefix : undefined,
    true,
  ).path;

  const handlers: Record<string, () => Promise<DavRes> | DavRes> = {
    HEAD: () => davClient.handleHead(filePath),
    COPY: () => davClient.handleCopyMove(filePath, 'COPY', destination),
    MOVE: () => davClient.handleCopyMove(filePath, 'MOVE', destination),
    DELETE: () => davClient.handleDelete(filePath),
    MKCOL: () => davClient.handleMkcol(filePath),
    PUT: () => davClient.handlePut(filePath, request),
    PROPFIND: () => davClient.handlePropfind(filePath, parseDepth(request.headers.get('Depth'))),
  };

  const handler = handlers[request.method];
  const davRes = handleDavRes(await handler(), isProxyRequest);

  return new Response(davRes.davXml, {
    status: davRes.davStatus,
    headers: davRes.davHeaders,
  });
}

function handleDavRes(davRes: DavRes, isProxyRequest: boolean) {
  const davHeaders = {
    ...(davRes.davXml ? { 'Content-Type': 'application/xml; charset=utf-8' } : {}),
    ...(davRes.davHeaders || {}),
  };

  let davXml = davRes.davXml;
  if (isProxyRequest && davXml) {
    const keyword = (runtimeEnv as any).PROXY_KEYWORD || runtimeEnv.PROTECTED.PROXY_KEYWORD;
    const prefix = keyword.startsWith('http') ? keyword : `/${keyword}`;
    davXml = davXml.replaceAll('<d:href>', `<d:href>${prefix}`);
  }

  return { davXml, davStatus: davRes.davStatus, davHeaders };
}
