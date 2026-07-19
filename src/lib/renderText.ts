// Splits plain-text content field values (not markdown) into paragraphs for rendering.
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Rough word count used to decide whether a "Read more" disclosure is needed.
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
