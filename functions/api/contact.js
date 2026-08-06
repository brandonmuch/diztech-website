import { verifyTurnstile, buildMimeMessage, jsonResponse } from "../../cf-functions-lib/email.js";
import { storeSubmission } from "../../cf-functions-lib/retention.js";

// Cloudflare Pages Function — handles POST /api/contact
// Requires (set in the Pages project's environment variables / bindings):
//   TURNSTILE_SECRET_KEY      - secret key for the Turnstile widget
//   CONTACT_DESTINATION_EMAIL - the mailbox that should receive submissions
//   SEND_EMAIL                - a "Send Email" binding (Email Routing) to that address
//   SUBMISSIONS                - a KV namespace binding, for the 6-month retention record
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    // Honeypot — bots that fill every field trip this.
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
    const company = get("company");
    const role = get("role");
    const serviceInterest = get("serviceInterest");
    const message = get("message");

    if (!firstName || !lastName || !email || !phone) {
      return jsonResponse({ ok: false, error: "Please fill in all required fields." }, 400);
    }

    const text = [
      `New contact form submission from ${firstName} ${lastName}`,
      "",
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Company: ${company || "—"}`,
      `Job title / role: ${role || "—"}`,
      `Service interest: ${serviceInterest || "—"}`,
      "",
      "Message:",
      message || "—",
    ].join("\n");

    const raw = buildMimeMessage({
      from: "website@diztech.co.zw",
      to: env.CONTACT_DESTINATION_EMAIL,
      subject: `New contact form submission — ${firstName} ${lastName}`,
      text,
    });

    const { EmailMessage } = await import("cloudflare:email");
    const message_ = new EmailMessage("website@diztech.co.zw", env.CONTACT_DESTINATION_EMAIL, raw);
    await env.SEND_EMAIL.send(message_);

    // Best-effort — a KV hiccup shouldn't fail a submission that already emailed fine.
    try {
      await storeSubmission(env.SUBMISSIONS, "contact", {
        firstName,
        lastName,
        email,
        phone,
        company,
        role,
        serviceInterest,
        message,
      });
    } catch {
      // swallow — the email above is the primary delivery path
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "Something went wrong. Please try again shortly." }, 500);
  }
}
