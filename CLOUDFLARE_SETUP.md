# Moving DizTech from Netlify to Cloudflare

All the code-side work is done and pushed to `main`. What's left needs your
Cloudflare and GitHub account access, so it has to happen in the dashboards.
Do these in order — later steps depend on earlier ones.

**Note on terminology:** this Cloudflare account's project deploys via
Cloudflare's newer unified Workers-with-static-assets model (you'll see
`npx wrangler deploy` in the build log, not classic "Pages"), even though
the dashboard section is still called "Workers & Pages". The repo's
`wrangler.toml` and `worker/index.js` are built for that model — a single
Worker that serves the static site and handles `/api/contact`,
`/api/careers`, `/auth`, and `/callback` itself.

## 1. Connect the project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → connect to Git.
2. Pick the `brandonmuch/diztech-website` repo.
3. It should auto-detect the build command (`npm run build`) and output directory (`dist`) from `wrangler.toml` — leave those as detected.
4. Deploy. This gets the site live on a `*.workers.dev` URL — forms and `/admin` won't work yet, that's steps 3–4 below.

## 2. Point the domain at Cloudflare

- In the project → **Settings → Domains & Routes**, add `diztech.co.zw` (and `www` if you use it).
- If the domain's DNS isn't already on Cloudflare, it'll walk you through changing nameservers at your registrar. This is the step that actually cuts over from Netlify — do it once everything below is verified working on the `*.workers.dev` URL.

## 3. Contact & Careers forms

**Enable Email Routing** (lets the Worker send email without a third-party service):

1. Cloudflare dashboard → your domain → **Email** → **Email Routing** → enable it.
2. Add **both** `info@diztech.co.zw` (contact form) and `careers@diztech.co.zw` (careers form) as **destination addresses** and verify each one (Cloudflare emails a confirmation link to that mailbox itself, so you'll need access to both inboxes to click the links).

The `SEND_EMAIL` binding itself is already declared in `wrangler.toml` and showed up correctly in a local dry-run (`env.SEND_EMAIL — Send Email`) — you shouldn't need to add anything for it manually, just verify the destination address above.

**Get a Turnstile site key** (Cloudflare's captcha, replacing Netlify's reCAPTCHA):

1. Cloudflare dashboard → **Turnstile** → **Add site**.
2. Domain: `diztech.co.zw` (add the `.workers.dev` domain too while testing).
3. Copy the **Site Key** and **Secret Key**.

**Set these in the project → Settings → Variables and Secrets** (Production, and Preview if you want previews to work too):

| Variable | Value | Type |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | the Turnstile Site Key | **build** variable — Astro inlines this into the HTML at build time, so it must be set as a build env var, not just a runtime one |
| `TURNSTILE_SECRET_KEY` | the Turnstile Secret Key | Secret |
| `CONTACT_DESTINATION_EMAIL` | `info@diztech.co.zw` | Variable |
| `CAREERS_DESTINATION_EMAIL` | `careers@diztech.co.zw` | Variable |

Redeploy after setting these (env var changes need a fresh deploy to take effect).

**6-month automatic data retention (including CVs):** every submission — contact enquiries and careers applications, CV attachment included — also gets written to a Cloudflare KV namespace with a 6-month expiry, so Cloudflare deletes it automatically. No cron job, nothing to remember to clean up.

1. Cloudflare dashboard → **Storage & Databases → KV → Create a namespace**. Name it something like `diztech-submissions`.
2. Copy the **Namespace ID** it gives you.
3. In `wrangler.toml`, replace `REPLACE_WITH_KV_NAMESPACE_ID` with that real ID (send it to me and I'll commit it, or edit the file directly on GitHub).
4. Redeploy.

Worth knowing: this only covers the copy Cloudflare holds. The copy that gets *emailed* to `info@`/`careers@` is a separate thing living in that mailbox, and this doesn't touch it — set up an auto-delete/archive rule at 6 months in whatever you use for that inbox (Gmail, Outlook, Zoho all support this) if you want the promise to hold end-to-end.

## 4. `/admin` CMS login (GitHub OAuth)

Decap CMS now logs in via GitHub instead of Netlify Identity. You need a GitHub OAuth App:

1. GitHub → your account → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: `https://diztech.co.zw`
3. Authorization callback URL: `https://diztech.co.zw/callback`
4. Create it, then copy the **Client ID** and generate a **Client secret**.

**Set these in the project → Settings → Variables and Secrets:**

| Variable | Value | Type |
|---|---|---|
| `GITHUB_OAUTH_CLIENT_ID` | the OAuth App's Client ID | Variable |
| `GITHUB_OAUTH_CLIENT_SECRET` | the OAuth App's Client secret | Secret |

Whoever logs into `/admin` needs **write access to the GitHub repo** (Decap uses their own GitHub permissions, not a shared login) — add them as a collaborator on `brandonmuch/diztech-website` if they aren't already.

## 5. Turn off Netlify

Once `diztech.co.zw` is serving from Cloudflare and you've tested the forms and `/admin` login on the live domain:

- Netlify dashboard → the DizTech site → **Site settings → General → Danger zone → Delete this site** (or just stop the deploy/disconnect the repo, if you'd rather keep it around as a fallback for a week first).

## Testing checklist before cutting the domain over

- [ ] Home page loads on the `*.workers.dev` URL
- [ ] Contact form submits and you receive the email
- [ ] Careers form submits with a CV attached and you receive the email with the attachment
- [ ] After submitting, a new key shows up in the KV namespace (dashboard → your KV namespace → should list an entry like `contact:169...:...`)
- [ ] `/admin` loads, "Login with GitHub" works, and you can edit + publish a change
