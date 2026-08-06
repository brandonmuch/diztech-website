// Cloudflare Pages Function — GET /auth
// First leg of the Decap CMS <-> GitHub OAuth handshake: sends the browser
// to GitHub's authorize screen. Requires (Pages env vars):
//   GITHUB_OAUTH_CLIENT_ID
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo,user");

  return Response.redirect(authorizeUrl.toString(), 302);
}
