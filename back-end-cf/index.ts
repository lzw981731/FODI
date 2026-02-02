import { cacheRequest } from './handlers/request-handler';
import { fetchAccessToken } from './services/fetchUtils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    const indexFile = env.PROTECTED.INDEX_FILENAME || 'd.html';
    if (url.pathname === `/${indexFile}`) {
      const newUrl = new URL(request.url);
      newUrl.pathname = `/${indexFile}`;
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

