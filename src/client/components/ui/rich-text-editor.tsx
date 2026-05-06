"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef } from "react";
import { Toolbar } from "@client/components/ui/rich-text-toolbar";

// `RichContentRenderer` is intentionally re-exported here so the public
// import surface (`@client/components/ui/rich-text-editor`) is unchanged
// after the 2026-05 split into toolbar/popover/renderer modules.
export { RichContentRenderer } from "@client/components/ui/rich-text-renderer";

// ============================================
// RICH TEXT EDITOR
// ============================================

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Write your notification content...",
  editable = true,
  minHeight = "200px",
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-md max-w-full my-2",
          style: "max-height: 400px; object-fit: contain;",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Superscript,
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `rich-content max-w-none focus:outline-none px-4 py-3 text-sm`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync content from parent when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
