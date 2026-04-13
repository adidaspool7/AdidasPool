"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  ImageIcon,
  LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Superscript as SuperscriptIcon,
  Minus,
  Type,
  Upload,
  Loader2,
  Palette,
} from "lucide-react";

// ============================================
// TOOLBAR BUTTON
// ============================================

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

// ============================================
// IMAGE INSERT POPOVER
// ============================================

function ImageInsert({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertFromUrl = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
      setUrl("");
      setOpen(false);
    }
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Upload failed");
          return;
        }
        const { url: imageUrl } = await res.json();
        editor.chain().focus().setImage({ src: imageUrl }).run();
        setOpen(false);
      } catch {
        alert("Failed to upload image");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert image"
          className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-3" align="start">
        <p className="text-sm font-medium">Insert Image</p>

        {/* Upload */}
        <div
          className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
          }}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Click or drag & drop an image
              </p>
              <p className="text-xs text-muted-foreground/60">
                JPEG, PNG, GIF, WebP — max 5 MB
              </p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or paste URL</span>
          <div className="flex-1 border-t" />
        </div>

        {/* URL input */}
        <Input
          placeholder="Paste image URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && insertFromUrl()}
        />
        <Button size="sm" onClick={insertFromUrl} disabled={!url.trim()} className="w-full">
          Insert from URL
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// LINK INSERT POPOVER
// ============================================

function LinkInsert({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const insert = () => {
    if (url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
      setUrl("");
      setOpen(false);
    }
  };

  const unlink = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert link"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            editor.isActive("link")
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2" align="start">
        <p className="text-sm font-medium">Insert Link</p>
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && insert()}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={insert} disabled={!url.trim()} className="flex-1">
            Apply
          </Button>
          {editor.isActive("link") && (
            <Button size="sm" variant="outline" onClick={unlink}>
              Remove
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// FOOTNOTE INSERT
// ============================================

function FootnoteInsert({ editor }: { editor: Editor }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [footnoteCount, setFootnoteCount] = useState(0);

  const insert = () => {
    if (text.trim()) {
      const num = footnoteCount + 1;
      setFootnoteCount(num);

      // Check if we need the separator BEFORE any edits
      const needsSeparator = !editor.getHTML().includes('footnote-sep');

      // Insert superscript reference at cursor position
      editor
        .chain()
        .focus()
        .toggleSuperscript()
        .insertContent(`[${num}]`)
        .toggleSuperscript()
        .run();

      // Build footnote content to append at the end
      const footnoteHtml =
        (needsSeparator
          ? '<hr class="footnote-sep"><p><strong>Notes</strong></p>'
          : '') +
        `<p><sup>[${num}]</sup> ${text.trim()}</p>`;

      // Move to end and insert (preserves all existing content including images)
      editor.chain().focus("end").insertContent(footnoteHtml).run();

      setText("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Add footnote"
          className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2" align="start">
        <p className="text-sm font-medium">Add Footnote</p>
        <Input
          placeholder="Footnote text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && insert()}
        />
        <Button size="sm" onClick={insert} disabled={!text.trim()} className="w-full">
          Add Footnote
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// COLOR PICKER
// ============================================

const PRESET_COLORS = [
  "#000000", "#374151", "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

function ColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const currentColor = editor.getAttributes("textStyle").color || "#000000";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Text color"
          className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Palette className="h-4 w-4" style={{ color: currentColor !== "#000000" ? currentColor : undefined }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-2" align="start">
        <p className="text-sm font-medium">Text Color</p>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                setOpen(false);
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-8 h-6 border-0 p-0 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">Custom</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-xs h-6"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setOpen(false);
            }}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// TOOLBAR
// ============================================

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph") && !editor.isActive("heading")}
        title="Normal text"
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Media & special */}
      <ImageInsert editor={editor} />
      <LinkInsert editor={editor} />
      <FootnoteInsert editor={editor} />
      <ColorPicker editor={editor} />

      <div className="w-px h-5 bg-border mx-1" />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

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

// ============================================
// READ-ONLY RICH CONTENT RENDERER
// ============================================

export function RichContentRenderer({ html }: { html: string }) {
  return (
    <div
      className="rich-content max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
