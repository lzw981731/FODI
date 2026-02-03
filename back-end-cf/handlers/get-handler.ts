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
  if (requestUrl.pathname === '/deployfodi') {
    return renderDeployHtml(env, requestUrl);
  }

  // download files
  const proxyKeyword = env.PROXY_KEYWORD || env.PROTECTED.PROXY_KEYWORD || '';
  const isUrlProxy = proxyKeyword.startsWith('http');
  const proxyPrefix = isUrlProxy ? new URL(proxyKeyword).pathname : `/${proxyKeyword}`;

  // 只有当 proxyKeyword 不为空且匹配前缀时，才认为是代理下载请求
  const isProxyRequest = !!(
    proxyKeyword &&
    (isUrlProxy
      ? requestUrl.href.startsWith(proxyKeyword)
      : (proxyPrefix !== '/' && requestUrl.pathname.startsWith(proxyPrefix)))
  );

  const { path: filePath, tail: fileName } = parsePath(
    requestUrl.searchParams.get('file') || decodeURIComponent(requestUrl.pathname),
    isProxyRequest ? proxyPrefix : undefined,
  );

  if (!fileName) {
    return new Response('欢迎访问，这是一个html示范页，请上传代码', { status: 400 });
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
