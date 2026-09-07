/**
 * Renders a JSON-LD <script> for search engines. Server component — the tag is
 * in the initial HTML, no client JS. Pass one schema object or an array.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // Structured data is machine-only; JSON.stringify already escapes quotes,
      // and we guard the one sequence that could break out of the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
