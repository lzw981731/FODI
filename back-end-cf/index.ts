import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    const indexBase = indexFile.replace(/\.html$/, '');

    // 如果访问的是列表页路径（如 /c.html 或 /c）
    if (url.pathname === `/${indexFile}` || url.pathname === `/${indexBase}`) {
      // 内部读取 index.html，但保持浏览器地址栏不变
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/index.html';
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

