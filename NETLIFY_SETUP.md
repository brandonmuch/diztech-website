# Setting up DizTech on Netlify

The code is back to Netlify's native integrations (Netlify Forms, Netlify
Identity + Git Gateway for `/admin`). `CLOUDFLARE_SETUP.md` in this repo is
no longer the path being used — left in place in case Cloudflare comes back
up later, but ignore it for now.

## 1. Connect the site

1. Netlify dashboard → **Add new site → Import an existing project** → connect to Git → pick `brandonmuch/diztech-website`.
2. Build command `npm run build`, publish directory `dist` — should auto-detect from `netlify.toml`.
3. Deploy. Gets the site live on a `*.netlify.app` URL.

## 2. Point the domain (records only, no nameserver change)

Since your registrar won't hand over full nameserver control:

1. Site settings → **Domain management → Add a domain** → `diztech.co.zw`.
2. When Netlify asks how to configure DNS, choose the option for **using your own/external DNS** (not "Use Netlify DNS").
3. Netlify will show you the exact record(s) to add — typically an **A record** pointing at `75.2.60.5` for the root domain, and a **CNAME** for `www` pointing at `<your-site-name>.netlify.app`. Add those at your existing DNS host/registrar.
4. Wait for DNS to propagate, then Netlify auto-provisions HTTPS once it verifies.

## 3. Contact & Careers forms

Netlify Forms works automatically once deployed — it detects the `data-netlify="true"` forms in the HTML at build time. Two things to configure:

**Email notifications** — Site settings → **Forms → Form notifications → Add notification → Email notification**:
- Form: `contact` → notify `info@diztech.co.zw`
- Form: `careers-application` → notify `careers@diztech.co.zw`

**reCAPTCHA** (the forms already have `data-netlify-recaptcha="true"`):
1. Get a reCAPTCHA v2 key pair at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) for `diztech.co.zw`.
2. Site settings → **Forms → Spam filters** → add the Site Key and Secret Key.

## 4. `/admin` CMS login (Netlify Identity)

Much simpler than the Cloudflare/GitHub OAuth path:

1. Site settings → **Identity → Enable Identity**.
2. Registration preferences → set to **Invite only** (so randoms can't self-register).
3. Identity → **Services → Git Gateway → Enable Git Gateway** (this is what lets logged-in Identity users publish to the repo — no separate GitHub account or OAuth app needed for the client).
4. Identity → **Invite users** → enter the client's email. They'll get an email to set a password, then log into `diztech.co.zw/admin`.

## 5. 6-month automatic retention (including CVs)

Netlify Forms doesn't have a built-in auto-expiry like Cloudflare KV did, so this is a **scheduled Function** (`netlify/functions/prune-submissions.js`) that runs daily and deletes any submission older than 6 months via Netlify's API.

**Set these in Site settings → Environment variables:**

| Variable | Value | Where to get it |
|---|---|---|
| `NETLIFY_API_TOKEN` | a personal access token | User menu (top right) → **User settings → Applications → Personal access tokens → New access token** |
| `NETLIFY_SITE_ID` | this site's API ID | Site settings → **General → Site details → Site ID** (not the site name) |

Redeploy after setting these. I haven't been able to test this function against a real Netlify account (no account access from here) — worth checking the function's logs after its first scheduled run (Site → **Functions** → `prune-submissions` → logs) to confirm it's finding and pruning submissions correctly, or trigger it manually via Netlify CLI (`netlify functions:invoke prune-submissions`) to test sooner than waiting for the daily schedule.

Same caveat as before: this only prunes what Netlify Forms holds. The **email notification copies** sitting in `info@`/`careers@` are separate and need their own auto-delete rule in whatever you use for that inbox if you want the 6-month promise to hold end-to-end.

## Testing checklist before cutting the domain over

- [ ] Home page loads on the `*.netlify.app` URL
- [ ] Contact form submits, shows up in Site → Forms, and you receive the email at `info@`
- [ ] Careers form submits with a CV attached, shows up in Forms with the attachment, email arrives at `careers@`
- [ ] `/admin` → Netlify Identity login works for an invited user, and they can edit + publish a change
- [ ] `prune-submissions` function appears under Site → Functions and its logs show a successful run
