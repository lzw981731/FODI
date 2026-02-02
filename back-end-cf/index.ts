import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    const indexBase = indexFile.replace(/\.html$/, '');

    // 允许的列表页路径：自定义路径 + 永久保留的 d.html 路径
    const isListingPage =
      url.pathname === `/${indexFile}` ||
      url.pathname === `/${indexBase}` ||
      url.pathname === '/d.html' ||
      url.pathname === '/d';

    if (isListingPage) {
      const assetUrl = new URL(request.url);
      // 物理文件重命名为 app.html 以避开 Cloudflare 对 index.html 的自动重定向（Pretty URLs）
      assetUrl.pathname = '/app.html';
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
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

