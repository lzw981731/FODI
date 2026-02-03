import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';
import { runtimeEnv } from './types/env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // 核心修复：同步环境对象到全局，确保 services 下的文件能读到当前请求的 PROXY_KEYWORD 等配置
    Object.assign(runtimeEnv, env);

    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    const indexBase = indexFile.replace(/\.html$/, '');

    // 允许的列表页路径识别（已撤销首页 / 的拦截，只有访问 d.html 才会触发列表渲染）
    const isCustomPath = url.pathname === `/${indexFile}` || url.pathname === `/${indexBase}`;
    const isDefaultPath = url.pathname === '/d.html' || url.pathname === '/d';

    if (request.method === 'GET' && (isCustomPath || isDefaultPath)) {
      // 1. 如果访问的是默认路径，但配置了自定义路径，则强制跳转到自定义路径
      if (isDefaultPath && indexFile !== 'd.html') {
        return Response.redirect(`${url.origin}/${indexFile}`, 301);
      }

      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/app.html';

      // 2. 内部请求静态资源
      let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

      // 3. 拦截自动跳转，保持地址栏 URL 不变
      if (response.status >= 300 && response.status < 400 && response.headers.has('Location')) {
        const location = response.headers.get('Location')!;
        const nextUrl = new URL(location, request.url);
        response = await env.ASSETS.fetch(new Request(nextUrl.toString(), request));
      }

      return response;
    }

    // 所有 API 请求（POST）和非列表页 GET 请求交回给后端处理
    try {
      return cacheRequest(request, env, ctx);
    } catch (e: any) {
      return Response.json({ error: e.message });
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    Object.assign(runtimeEnv, env);
    ctx.waitUntil(fetchAccessToken(env.OAUTH, env.FODI_CACHE));
  },
};
