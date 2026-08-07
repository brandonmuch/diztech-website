// Netlify Scheduled Function — runs daily and deletes Netlify Forms
// submissions (Contact and Careers, including CV attachments) older than
// 6 months, enforcing the retention promise in the Privacy Policy. This
// is Netlify's equivalent of the Cloudflare KV auto-expiry approach used
// during the brief Cloudflare trial — Netlify Forms has no built-in TTL,
// so a scheduled prune is the way to get the same "actually enforced,
// not just a policy on paper" outcome.
//
// Requires two environment variables, set in Site settings -> Environment
// variables:
//   NETLIFY_API_TOKEN - a personal access token (User settings -> Applications
//                        -> New access token). Needs access to this site.
//   NETLIFY_SITE_ID   - this site's API ID (Site settings -> General ->
//                        Site details -> Site ID). Note: NOT the site name.
//
// Docs: https://docs.netlify.com/functions/scheduled-functions/
//       https://docs.netlify.com/api/get-started/#form-submissions

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182; // ~6 months

export default async () => {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    console.error("prune-submissions: missing NETLIFY_API_TOKEN or NETLIFY_SITE_ID — skipping run.");
    return new Response("Missing configuration", { status: 500 });
  }

  const cutoff = Date.now() - SIX_MONTHS_MS;
  let page = 1;
  let deleted = 0;
  let checked = 0;

  while (true) {
    const listRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/submissions?page=${page}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) {
      console.error(`prune-submissions: failed to list submissions (page ${page}): ${listRes.status}`);
      break;
    }

    const submissions = await listRes.json();
    if (!Array.isArray(submissions) || submissions.length === 0) break;

    for (const submission of submissions) {
      checked++;
      const createdAt = new Date(submission.created_at).getTime();
      if (createdAt < cutoff) {
        const delRes = await fetch(`https://api.netlify.com/api/v1/submissions/${submission.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (delRes.ok) {
          deleted++;
        } else {
          console.error(`prune-submissions: failed to delete submission ${submission.id}: ${delRes.status}`);
        }
      }
    }

    page++;
  }

  const summary = `prune-submissions: checked ${checked}, deleted ${deleted} submission(s) older than 6 months.`;
  console.log(summary);
  return new Response(summary, { status: 200 });
};

export const config = {
  schedule: "@daily",
};
