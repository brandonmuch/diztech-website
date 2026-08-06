// Handles any <form data-async-submit="/api/whatever"> by POSTing its
// FormData to a Cloudflare Pages Function and showing an inline status
// message, instead of relying on Netlify's automatic form handling.
//
// Requires a Turnstile widget (div.cf-turnstile) inside the form — the
// Turnstile script itself is loaded once, sitewide, in BaseLayout.

document.querySelectorAll<HTMLFormElement>("form[data-async-submit]").forEach((form) => {
  const endpoint = form.dataset.asyncSubmit;
  if (!endpoint) return;

  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const defaultLabel = submitBtn?.textContent ?? "Submit";

  let statusEl = form.querySelector<HTMLElement>(".form-status");
  if (!statusEl) {
    statusEl = document.createElement("p");
    statusEl.className = "form-status";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    form.appendChild(statusEl);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    statusEl!.textContent = "";
    statusEl!.classList.remove("form-status--error", "form-status--ok");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
      });
      const json = await res.json().catch(() => ({ ok: false }));

      if (res.ok && json.ok) {
        form.reset();
        // Turnstile tokens are single-use — reset the widget for next time.
        const w = window as unknown as { turnstile?: { reset: (el?: HTMLElement) => void } };
        w.turnstile?.reset(form.querySelector(".cf-turnstile") ?? undefined);
        statusEl!.textContent = "Thanks — we've received your submission and will be in touch shortly.";
        statusEl!.classList.add("form-status--ok");
      } else {
        statusEl!.textContent = json.error || "Something went wrong. Please try again.";
        statusEl!.classList.add("form-status--error");
      }
    } catch {
      statusEl!.textContent = "Something went wrong. Please check your connection and try again.";
      statusEl!.classList.add("form-status--error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      }
    }
  });
});
