// Enforces the Privacy Policy's "up to 6 months" retention promise for
// data we actually control. Each submission gets written to the
// SUBMISSIONS KV namespace with an expirationTtl — Cloudflare deletes the
// key itself once that elapses, no scheduled job required.
//
// This does NOT delete the copy that was emailed to the destination
// mailbox — that's a separate copy outside anything this Worker controls,
// and needs its own auto-delete rule set up in that mailbox (see
// CLOUDFLARE_SETUP.md). KV is the system of record this promise is
// actually enforced against.

const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 182; // ~6 months

/**
 * @param {KVNamespace} kv
 * @param {"contact" | "careers"} type
 * @param {Record<string, string>} fields
 * @param {Array<{filename: string, contentType: string, base64: string}>} [attachments]
 */
export async function storeSubmission(kv, type, fields, attachments = []) {
  if (!kv) return; // binding not configured yet - don't break the actual submission over it
  const id = crypto.randomUUID();
  const key = `${type}:${Date.now()}:${id}`;
  const value = JSON.stringify({
    type,
    submittedAt: new Date().toISOString(),
    fields,
    attachments,
  });
  await kv.put(key, value, { expirationTtl: SIX_MONTHS_SECONDS });
}
