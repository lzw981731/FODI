import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    const indexBase = indexFile.replace(/\.html$/, '');

    // 允许的列表页路径识别
    const isCustomPath = url.pathname === `/${indexFile}` || url.pathname === `/${indexBase}`;
    const isDefaultPath = url.pathname === '/d.html' || url.pathname === '/d';

    if (isCustomPath || isDefaultPath) {
      // 1. 如果访问的是默认路径，但配置了自定义路径，则强制跳转到自定义路径（最高标准）
      if (isDefaultPath && indexFile !== 'd.html') {
        return Response.redirect(`${url.origin}/${indexFile}`, 301);
      }

      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/app.html';

      // 2. 内部请求静态资源
      let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

      // 3. 核心修复：如果触发了 Cloudflare 的 Pretty URLs 自动跳转（301/302），他在内部跟随跳转
      // 这样可以防止浏览器端接收到跳转指令，从而让地址栏保持在 /c.html
      if (response.status >= 300 && response.status < 400 && response.headers.has('Location')) {
        const location = response.headers.get('Location')!;
        const nextUrl = new URL(location, request.url);
        response = await env.ASSETS.fetch(new Request(nextUrl.toString(), request));
      }

      return response;
    }

    // 访问根目录 / 或其他路径，交回给后端的逻辑处理（保持原汁原味）

    try {
      return cacheRequest(request, env, ctx);
    } catch (e: any) {
      return Response.json({ error: e.message });
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(fetchAccessToken(env.OAUTH, env.FODI_CACHE));
  },
};

