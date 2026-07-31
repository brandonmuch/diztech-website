import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";
import { load as parseYaml } from "js-yaml";

const home = defineCollection({
  loader: glob({ pattern: "*.md", base: "content/home" }),
});

const legal = defineCollection({
  loader: glob({ pattern: "*.md", base: "content/legal" }),
});

const services = defineCollection({
  loader: glob({ pattern: "*.md", base: "content/services" }),
  schema: z.object({
    title: z.string(),
    icon: z.string(),
    order: z.number(),
    summary: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    overview: z.object({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
    challenges: z.object({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
    approach: z.object({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
    features: z.array(
      z.object({ title: z.string(), description: z.string() })
    ),
    benefits: z.object({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
    whyChooseUs: z
      .array(
        z.object({ icon: z.string(), title: z.string(), text: z.string() })
      )
      .min(3)
      .max(4),
    relatedServices: z.array(z.string()).default([]),
    cta: z.object({
      heading: z.string(),
      buttonText: z.string(),
      buttonHref: z.string(),
    }),
  }),
});

const insights = defineCollection({
  loader: glob({ pattern: "*.md", base: "content/insights" }),
  schema: z.object({
      title: z.string(),
      category: z.enum([
        "SAP",
        "S/4HANA",
        "SuccessFactors",
        "Public Finance",
        "Digital Transformation",
        "ERP Implementation",
        "Project Management",
        "Change Management",
        "Business Advisory",
      ]),
      date: z.coerce.date(),
      excerpt: z.string(),
      image: z.string(),
      featured: z.boolean().default(false),
    }),
});

const siteData = defineCollection({
  loader: file("content/data/africa-presence.yml", {
    parser: (text) => {
      const parsed = parseYaml(text) as { presence: Array<Record<string, unknown>> };
      return parsed.presence;
    },
  }),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    svgId: z.string(),
    country: z.string(),
    city: z.string(),
    label: z.string(),
    lat: z.number(),
    lng: z.number(),
    isHQ: z.boolean().default(false),
  }),
});

const siteSettings = defineCollection({
  loader: file("content/data/site-settings.yml", {
    parser: (text) => {
      const parsed = parseYaml(text) as { settings: { id: string; wordmark: string; tagline: string } };
      return [parsed.settings];
    },
  }),
  schema: z.object({
    wordmark: z.string(),
    tagline: z.string(),
  }),
});

export const collections = { home, legal, services, insights, siteData, siteSettings };
