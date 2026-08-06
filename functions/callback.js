// Cloudflare Pages Function — GET /callback
// Second leg of the Decap CMS <-> GitHub OAuth handshake: exchanges the
// code GitHub sent back for an access token, then hands that token to the
// Decap CMS popup via postMessage (the exact protocol Decap/Netlify CMS's
// "github" backend expects from a self-hosted OAuth provider). Requires
// (Pages env vars):
//   GITHUB_OAUTH_CLIENT_ID
//   GITHUB_OAUTH_CLIENT_SECRET  (set as a secret, not a plain env var)
function renderPage(message) {
  // Decap CMS listens for a "message" event with this exact
  // "authorization:github:..." format on the window that opened the popup.
  return `<!doctype html>
<html><body>
<script>
  (function() {
    function receiveMessage(message) {
      window.opener.postMessage(
        'authorization:github:${message.status}:${JSON.stringify(message.content).replace(/'/g, "\\'")}',
        message.origin
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body></html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing OAuth code", { status: 400 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  const tokenJson = await tokenRes.json();

  if (tokenJson.error || !tokenJson.access_token) {
    return new Response(
      renderPage({ status: "error", content: { message: tokenJson.error_description || "OAuth failed" } }),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response(
    renderPage({ status: "success", content: { token: tokenJson.access_token, provider: "github" } }),
    { headers: { "Content-Type": "text/html" } }
  );
}
