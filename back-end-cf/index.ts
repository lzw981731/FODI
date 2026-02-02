import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    const indexBase = indexFile.replace(/\.html$/, '');

    // 无论访问的是 /、/a.html 还是 /a，后端统一从资源库中读取并返回物理文件 index.html
    if (url.pathname === '/' || url.pathname === `/${indexFile}` || url.pathname === `/${indexBase}`) {
      const newUrl = new URL(request.url);
      newUrl.pathname = '/index.html'; // 物理文件永远是 index.html
      return env.ASSETS.fetch(new Request(newUrl.toString(), request));
    }

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

