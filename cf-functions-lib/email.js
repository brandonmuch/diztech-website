// Shared helpers for Cloudflare Pages Functions. Deliberately kept outside
// /functions so Cloudflare's file-based router never treats it as a route.

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token, secretKey, remoteIp) {
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }),
  });
  const json = await res.json();
  return json.success === true;
}

function encodeHeaderValue(value) {
  // Keep header values ASCII-safe; encode as UTF-8 base64 word if needed.
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

/**
 * Builds a raw RFC 2045 MIME message, optionally with base64 file
 * attachments, for use with Cloudflare's EmailMessage API. Written by hand
 * (no third-party mime library) so there's no dependency-version guesswork.
 *
 * @param {object} opts
 * @param {string} opts.from
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.text
 * @param {Array<{filename: string, contentType: string, base64: string}>} [opts.attachments]
 */
export function buildMimeMessage({ from, to, subject, text, attachments = [] }) {
  const boundary = `----DizTechBoundary${crypto.randomUUID().replace(/-/g, "")}`;
  const lines = [];

  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodeHeaderValue(subject)}`);
  lines.push("MIME-Version: 1.0");

  if (attachments.length === 0) {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(text);
    return lines.join("\r\n");
  }

  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(text);

  for (const att of attachments) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push("");
    // Wrap base64 at 76 chars per line, per RFC 2045.
    lines.push(att.base64.replace(/(.{76})/g, "$1\r\n"));
  }

  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

export async function fileToAttachment(file) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return {
    filename: file.name || "attachment",
    contentType: file.type || "application/octet-stream",
    base64: btoa(binary),
  };
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
