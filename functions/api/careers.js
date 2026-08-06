import { verifyTurnstile, buildMimeMessage, fileToAttachment, jsonResponse } from "../../cf-functions-lib/email.js";

// Cloudflare Pages Function — handles POST /api/careers
// Same env requirements as contact.js, plus:
//   CAREERS_DESTINATION_EMAIL - mailbox for applications (can be the same address)
//
// Cloudflare Workers/Pages cap request body size (typically 100MB on paid
// plans, less on free) and outbound email size is limited too — if CVs start
// bouncing, switch to uploading the file to an R2 bucket and emailing a link
// instead of attaching it directly.
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    if (formData.get("bot-field")) {
      return jsonResponse({ ok: true });
    }

    const token = formData.get("cf-turnstile-response");
    const verified = await verifyTurnstile(
      token,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP")
    );
    if (!verified) {
      return jsonResponse({ ok: false, error: "Verification failed. Please try again." }, 400);
    }

    const get = (name) => (formData.get(name) || "").toString().trim();
    const firstName = get("firstName");
    const lastName = get("lastName");
    const email = get("email");
    const phone = get("phone");
    const position = get("position");
    const message = get("message");
    const consent = get("consent");

    const cv = formData.get("cv");
    if (!firstName || !lastName || !email || !phone || !consent) {
      return jsonResponse({ ok: false, error: "Please fill in all required fields." }, 400);
    }
    if (!(cv instanceof File) || cv.size === 0) {
      return jsonResponse({ ok: false, error: "Please attach a CV / résumé." }, 400);
    }

    const attachments = [await fileToAttachment(cv)];

    const text = [
      `New careers application from ${firstName} ${lastName}`,
      "",
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Position applying for: ${position || "—"}`,
      "",
      "Message:",
      message || "—",
    ].join("\n");

    const raw = buildMimeMessage({
      from: "website@diztech.co.zw",
      to: env.CAREERS_DESTINATION_EMAIL || env.CONTACT_DESTINATION_EMAIL,
      subject: `New careers application — ${firstName} ${lastName}`,
      text,
      attachments,
    });

    const { EmailMessage } = await import("cloudflare:email");
    const destination = env.CAREERS_DESTINATION_EMAIL || env.CONTACT_DESTINATION_EMAIL;
    const message_ = new EmailMessage("website@diztech.co.zw", destination, raw);
    await env.SEND_EMAIL.send(message_);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Something went wrong. Please try again shortly." }, 500);
  }
}
