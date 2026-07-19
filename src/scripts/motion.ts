// Shared scroll-reveal enhancement, loaded once site-wide via BaseLayout.
// Respects prefers-reduced-motion: reduce by revealing everything instantly.

const prefersReduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const revealTargets = document.querySelectorAll<HTMLElement>("[data-reveal]");

if (prefersReduced || !("IntersectionObserver" in window)) {
  revealTargets.forEach((el) => el.classList.add("is-revealed"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealTargets.forEach((el) => observer.observe(el));
}
