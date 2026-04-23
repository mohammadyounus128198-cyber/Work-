export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `"${key}":${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}