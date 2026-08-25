/**
 * Estimate reading time in minutes from raw Markdown.
 *
 * Editors should not have to count words, so `readingTime` is optional in the
 * article schema. When it is left blank this fills it in; when it is set, the
 * editor's own figure wins — a piece that is mostly photographs may deserve a
 * number that word count alone would not produce.
 *
 * 220 words per minute is the usual figure for adult reading of general prose.
 */
export function readingTime(markdown: string): number {
  const prose = markdown
    // Frontmatter is not part of the piece.
    .replace(/^---[\s\S]*?---/, "")
    // Nor are code fences, image URLs or link targets.
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Strip the remaining Markdown punctuation so it does not inflate the count.
    .replace(/[#>*_`~-]/g, " ");

  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
