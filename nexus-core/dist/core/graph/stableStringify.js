export function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (value !== null && typeof value === "object") {
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `"${key}":${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
}