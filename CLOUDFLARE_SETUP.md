# Moving DizTech from Netlify to Cloudflare Pages

All the code-side work is done and pushed to `main`. What's left needs your
Cloudflare and GitHub account access, so it has to happen in the dashboards.
Do these in order — later steps depend on earlier ones.

## 1. Connect the Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick the `brandonmuch/diztech-website` repo.
3. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. This alone gets the static site live on a `*.pages.dev` URL — forms and `/admin` won't work yet, that's steps 2–4.

## 2. Point the domain at Cloudflare

- In the Pages project → **Custom domains**, add `diztech.co.zw` (and `www` if you use it).
- If the domain's DNS isn't already on Cloudflare, it'll walk you through changing nameservers at your registrar. This is the step that actually cuts over from Netlify — do it once everything below is verified working on the `*.pages.dev` URL.

## 3. Contact & Careers forms

**Enable Email Routing** (lets a Pages Function send email without a third-party service):

1. Cloudflare dashboard → your domain → **Email** → **Email Routing** → enable it.
2. Add the mailbox that should receive submissions (e.g. `info@diztech.co.zw`) as a **destination address** and verify it (Cloudflare emails a confirmation link).

**Get a Turnstile site key** (Cloudflare's captcha, replacing Netlify's reCAPTCHA):

1. Cloudflare dashboard → **Turnstile** → **Add site**.
2. Domain: `diztech.co.zw` (add the `.pages.dev` domain too while testing).
3. Copy the **Site Key** and **Secret Key**.

**Set these in the Pages project → Settings → Environment variables** (Production, and Preview if you want previews to work too):

| Variable | Value |
|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | the Turnstile Site Key (this one is a **build** variable — it gets baked into the HTML) |
| `TURNSTILE_SECRET_KEY` | the Turnstile Secret Key — mark **Encrypt** |
| `CONTACT_DESTINATION_EMAIL` | the verified mailbox from Email Routing above |
| `CAREERS_DESTINATION_EMAIL` | same address, or a different verified one |

**Add the Send Email binding** — Pages project → Settings → Functions → Bindings → add binding of type **Send Email**, name it `SEND_EMAIL`, and point it at the same verified destination address. (`wrangler.toml` in the repo already declares this binding; the dashboard step is what actually wires it up for the deployed project.)

Redeploy after setting these (env var changes need a fresh deploy to take effect).

## 4. `/admin` CMS login (GitHub OAuth)

Decap CMS now logs in via GitHub instead of Netlify Identity. You need a GitHub OAuth App:

1. GitHub → your account → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: `https://diztech.co.zw`
3. Authorization callback URL: `https://diztech.co.zw/callback`
4. Create it, then copy the **Client ID** and generate a **Client secret**.

**Set these in the Pages project → Settings → Environment variables:**

| Variable | Value |
|---|---|
| `GITHUB_OAUTH_CLIENT_ID` | the OAuth App's Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | the OAuth App's Client secret — mark **Encrypt** |

Whoever logs into `/admin` needs **write access to the GitHub repo** (Decap uses their own GitHub permissions, not a shared login) — add them as a collaborator on `brandonmuch/diztech-website` if they aren't already.

## 5. Turn off Netlify

Once `diztech.co.zw` is serving from Cloudflare and you've tested the forms and `/admin` login on the live domain:

- Netlify dashboard → the DizTech site → **Site settings → General → Danger zone → Delete this site** (or just stop the deploy/disconnect the repo, if you'd rather keep it around as a fallback for a week first).

## Testing checklist before cutting the domain over

- [ ] Home page loads on the `*.pages.dev` URL
- [ ] Contact form submits and you receive the email
- [ ] Careers form submits with a CV attached and you receive the email with the attachment
- [ ] `/admin` loads, "Login with GitHub" works, and you can edit + publish a change
