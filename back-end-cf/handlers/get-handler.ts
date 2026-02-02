import { downloadFile } from '../services/fileMethods';
import { parsePath } from '../services/pathUtils';
import { renderDeployHtml } from '../services/deployMethods';
import { authorizeActions } from '../services/authUtils';

export async function handleGetRequest(
  request: Request,
  env: Env,
  requestUrl: URL,
): Promise<Response> {
  // display deployment
  const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
  const indexBase = indexFile.replace(/\.html$/, '');

  if (requestUrl.pathname === '/deployfodi') {
    return renderDeployHtml(env, requestUrl);
  }

  // 如果访问的是列表页路径，简单返回一个标志，防止后端去 OneDrive 找存这个名字的文件
  if (requestUrl.pathname === `/${indexFile}` || requestUrl.pathname === `/${indexBase}`) {
    return new Response('FODI Engine Active', { headers: { 'Content-Type': 'text/plain' } });
  }

  // download files
  const proxyKeyword = env.PROTECTED.PROXY_KEYWORD;
  const isUrlProxy = proxyKeyword.startsWith('http');
  const proxyPrefix = isUrlProxy ? new URL(proxyKeyword).pathname : `/${proxyKeyword}`;

  const isProxyRequest = !!(
    proxyKeyword &&
    (isUrlProxy
      ? requestUrl.href.startsWith(proxyKeyword)
      : requestUrl.pathname.startsWith(proxyPrefix))
  );

  const { path: filePath, tail: fileName } = parsePath(
    requestUrl.searchParams.get('file') || decodeURIComponent(requestUrl.pathname),
    isProxyRequest ? proxyPrefix : undefined,
  );

  if (!fileName) {
    return new Response('Bad Request', { status: 400 });
  } else if (fileName.toLowerCase() === env.PROTECTED.PASSWD_FILENAME.toLowerCase()) {
    return new Response('Access Denied', { status: 403 });
  } else if (
    !(
      await authorizeActions(['download'], {
        env,
        url: requestUrl,
        passwd: request.headers.get('Authorization') ?? '',
      })
    ).has('download')
  ) {
    return new Response('Access Denied', { status: 403 });
  }

  return downloadFile(
    filePath,
    isProxyRequest,
    requestUrl.searchParams.get('format'),
    request.headers,
  );
}
