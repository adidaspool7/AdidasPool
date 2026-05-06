/**
 * Read-only renderer for HTML produced by `RichTextEditor`. Kept in
 * its own server-renderable module (no "use client") so it can be used
 * inside Server Components without dragging in tiptap.
 */
export function RichContentRenderer({ html }: { html: string }) {
  return (
    <div
      className="rich-content max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
