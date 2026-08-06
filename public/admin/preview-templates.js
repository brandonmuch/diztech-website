/* Registers styled preview templates for the Decap CMS editor, so the
   preview pane looks like the real DizTech site (brand fonts/colors/basic
   layout) instead of plain unstyled text. Loaded as a plain script (no
   build step) right after decap-cms.js in admin/index.html, so it uses
   the globals that bundle exposes: CMS, React, createClass, h. */

// decap-cms.js exposes `h` (hyperscript) and `createClass` as globals for
// exactly this no-build-step use case — it does NOT expose `React` itself.

// Renders one top-level field of an entry, guessing a sensible shape from
// its value's type and the field name — good enough to cover every
// collection on the site without a bespoke template per file.
function renderField(key, value, widgetFor) {
  if (value === null || value === undefined || value === "") return null;

  // Markdown body fields (Insights articles, Privacy Policy) — widgetFor
  // renders these through Decap's own markdown preview, already correct.
  if (key === "body" && typeof value === "string" && value.length > 200) {
    return h(
      "div",
      { key: key, className: "preview-field" },
      h("span", { className: "preview-field__label" }, "Body"),
      h("div", { className: "preview-article-body" }, widgetFor("body"))
    );
  }

  // A single image path.
  if (typeof value === "string" && key.toLowerCase().includes("image") && !key.toLowerCase().includes("alt")) {
    return h(
      "div",
      { key: key, className: "preview-field" },
      h("img", { className: "preview-image", src: value, alt: "" })
    );
  }

  // Plain strings — headings vs. body copy, guessed from the field name.
  if (typeof value === "string") {
    var lower = key.toLowerCase();
    if (lower === "eyebrow") {
      return h("span", { key: key, className: "eyebrow" }, value);
    }
    if (lower.includes("heading") || lower === "title" || lower === "front" || lower === "stat") {
      return h("h2", { key: key }, value);
    }
    if (lower.includes("cta") || lower === "buttontext") {
      return h("span", { key: key, className: "preview-btn" }, value);
    }
    return h(
      "div",
      { key: key, className: "preview-field" },
      h("span", { className: "preview-field__label" }, key),
      h("p", null, value)
    );
  }

  // Objects with their own summary/bullets/text (overview, challenges,
  // approach, benefits on service pages).
  if (!Array.isArray(value) && typeof value === "object") {
    return h(
      "div",
      { key: key, className: "preview-field" },
      h("span", { className: "preview-field__label" }, key),
      value.summary ? h("p", null, h("strong", null, value.summary)) : null,
      Array.isArray(value.bullets)
        ? h(
            "ul",
            null,
            value.bullets.map(function (b, i) {
              return h("li", { key: i }, b);
            })
          )
        : null,
      value.heading ? h("h3", null, value.heading) : null,
      value.buttonText ? h("span", { className: "preview-btn" }, value.buttonText) : null
    );
  }

  // Arrays — list widgets (features, whyChooseUs, values, openings, logos,
  // locations, cards, industries...).
  if (Array.isArray(value)) {
    return h(
      "div",
      { key: key, className: "preview-field" },
      h("span", { className: "preview-field__label" }, key),
      value.map(function (item, i) {
        if (item && typeof item === "object") {
          var label = item.title || item.name || item.front || item.country || "";
          var detail = item.description || item.text || item.detail || item.back || item.address || "";
          return h(
            "div",
            { key: i, className: "preview-card" },
            label ? h("strong", null, label) : null,
            detail ? h("p", null, detail) : null
          );
        }
        return h("li", { key: i }, String(item));
      })
    );
  }

  return null;
}

var GenericPreview = createClass({
  render: function () {
    var entry = this.props.entry;
    var widgetFor = this.props.widgetFor;
    var data = entry.get("data").toJS();

    return h(
      "div",
      { className: "preview" },
      Object.keys(data).map(function (key) {
        return renderField(key, data[key], widgetFor);
      })
    );
  },
});

CMS.registerPreviewStyle("/admin/preview.css");

["home", "services", "insights", "legal", "site-data"].forEach(function (collectionName) {
  CMS.registerPreviewTemplate(collectionName, GenericPreview);
});
