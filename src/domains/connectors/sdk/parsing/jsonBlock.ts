// Connector SDK — shared by any connector whose page embeds a JSON array
// inside a larger, non-JSON <script> block (e.g. a Vue/React `data()`
// literal) rather than in a clean `application/ld+json`/`__NEXT_DATA__`
// script. Locates `"key":` then bracket-matches the following array,
// respecting string literals so a `]` inside a quoted value doesn't end the
// match early — the surrounding script is never parsed as a whole (it isn't
// valid standalone JSON), only the one array is extracted and parsed.

/** Finds `"key":[...]` in raw HTML/JS text and returns the parsed array, or
 * null if the key isn't present or the array is malformed. */
export function extractJsonArray(text: string, key: string): unknown[] | null {
  const marker = `"${key}":`;
  const start = text.indexOf(marker);
  if (start === -1) return null;

  const arrStart = start + marker.length;
  if (text[arrStart] !== "[") return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = arrStart; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(arrStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
