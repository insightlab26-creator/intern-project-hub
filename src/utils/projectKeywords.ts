export function formatProjectKeywords(keywords: string[]): string {
  return keywords.length > 0 ? keywords.map((keyword) => `#${keyword}`).join(" ") : "";
}

export function parseProjectKeywords(value: string): string[] {
  const parsed = value.includes("#") ? value.split("#").slice(1) : [value];

  return [...new Set(parsed.map((keyword) => keyword.trim()).filter(Boolean))];
}
