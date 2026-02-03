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

  // 只要配置了 PROXY_KEYWORD，就强制启用代理模式
  // 无论请求是来自代理域名还是直接访问，所有文件下载都将经过 Worker 代理
  const useProxy = !!proxyKeyword;

  // 尝试从路径中解析文件信息。
  // 如果是匹配代理前缀的请求，需要去除前缀；如果是直连请求，则不需要。
  const isUrlMatchProxy = proxyKeyword &&
    (isUrlProxy
      ? requestUrl.href.startsWith(proxyKeyword)
      : (proxyPrefix !== '/' && requestUrl.pathname.startsWith(proxyPrefix)));

  const { path: filePath, tail: fileName } = parsePath(
    requestUrl.searchParams.get('file') || decodeURIComponent(requestUrl.pathname),
    isUrlMatchProxy ? proxyPrefix : undefined,
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
    useProxy, // 强制传递 useProxy 参数，确保直连访问也走代理流
    requestUrl.searchParams.get('format'),
    request.headers,
  );
}
