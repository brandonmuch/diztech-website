// Worker entry point for this Cloudflare project. This account's Pages
// project deploys via `wrangler deploy` (Cloudflare's newer unified
// Workers-with-static-assets model), not the classic Pages Functions
// directory convention — so routing between the static build and our
// custom endpoints has to happen explicitly here rather than via Cloudflare
// auto-detecting /functions.
//
// The handlers themselves still live in /functions and /cf-functions-lib
// unchanged — this file just wires them up.
import { onRequestPost as contactHandler } from "../functions/api/contact.js";
import { onRequestPost as careersHandler } from "../functions/api/careers.js";
import { onRequestGet as authHandler } from "../functions/auth.js";
import { onRequestGet as callbackHandler } from "../functions/callback.js";

const routes = [
  { method: "POST", path: "/api/contact", handler: contactHandler },
  { method: "POST", path: "/api/careers", handler: careersHandler },
  { method: "GET", path: "/auth", handler: authHandler },
  { method: "GET", path: "/callback", handler: callbackHandler },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = routes.find((r) => r.method === request.method && r.path === url.pathname);

    if (route) {
      return route.handler({ request, env, ctx });
    }

    // Everything else — the actual site — is the static build output.
    return env.ASSETS.fetch(request);
  },
};
