"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
import { cn } from "@client/lib/utils";
import type { UserRole } from "@client/components/providers/role-provider";
import { hrGuideSections } from "./user-guide-content-hr";
import { candidateGuideSections } from "./user-guide-content-candidate";

interface GuideSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function UserGuideDialog({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const sections: GuideSection[] = role === "hr" ? hrGuideSections : candidateGuideSections;
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [query, setQuery] = useState("");
  const textIndexRef = useRef<Record<string, string>>({});

  // Reset to first section + rebuild search index every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setActiveId(sections[0]?.id ?? "");
    setQuery("");
    // Scroll content to top and index section text after dialog mounts
    const raf = requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      const idx: Record<string, string> = {};
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        idx[s.id] = `${s.title} ${el?.textContent ?? ""}`.toLowerCase();
      }
      textIndexRef.current = idx;
    });
    return () => cancelAnimationFrame(raf);
  }, [open, sections]);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const el = sectionRefs.current[id];
    const container = contentRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    }
  };

  // Highlight current section in TOC while scrolling
  const handleScroll = () => {
    const container = contentRef.current;
    if (!container) return;
    const top = container.scrollTop + 24;
    let current = sections[0]?.id ?? "";
    for (const s of sections) {
      const el = sectionRefs.current[s.id];
      if (el && el.offsetTop <= top) current = s.id;
    }
    if (current !== activeId) setActiveId(current);
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sections.filter((s) => (textIndexRef.current[s.id] ?? "").includes(q))
    : sections;

  // Highlight matches in the content pane (Chrome/Edge — CSS Custom Highlight API)
  useEffect(() => {
    const highlights = (
      window as unknown as { CSS?: { highlights?: Map<string, unknown> } }
    ).CSS?.highlights;
    const HighlightCtor = (
      window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }
    ).Highlight;
    const container = contentRef.current;
    if (!highlights || !HighlightCtor || !container) return;
    highlights.delete("guide-search");
    if (!open || !q) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.nodeValue ?? "";
      const lower = value.toLowerCase();
      let i = lower.indexOf(q);
      while (i !== -1) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + q.length);
        ranges.push(range);
        i = lower.indexOf(q, i + q.length);
      }
      node = walker.nextNode();
    }
    if (ranges.length) highlights.set("guide-search", new HighlightCtor(...ranges));
    return () => {
      highlights.delete("guide-search");
    };
  }, [q, open, sections]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          User guide
        </button>
      </DialogTrigger>
      <DialogContent
        className="!max-w-5xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden"
        style={{ height: "min(85vh, 800px)" }}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg">
            {role === "hr"
              ? "User Guide — HR Manager"
              : "User Guide — Candidate"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Talent Intelligence &amp; Language Verification Platform
          </p>
        </DialogHeader>
        <div className="grid grid-cols-[220px_1fr] flex-1 min-h-0 overflow-hidden">
          {/* TOC */}
          <aside className="border-r bg-muted/30 flex flex-col min-h-0">
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && query) {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuery("");
                    }
                  }}
                  placeholder="Search the guide…"
                  aria-label="Search the user guide"
                  className="w-full rounded-md border bg-background py-1.5 pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {q && (
                <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                  {filtered.length === 0
                    ? "No matches"
                    : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`}
                </p>
              )}
            </div>
            <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                    activeId === s.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="text-xs opacity-70 mr-2">{sections.indexOf(s) + 1}.</span>
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="overflow-y-auto px-8 py-6"
          >
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {sections.map((s) => (
                <section
                  key={s.id}
                  ref={(el) => {
                    sectionRefs.current[s.id] = el;
                  }}
                  id={s.id}
                  className="scroll-mt-4 mb-10"
                >
                  <h2 className="text-xl font-semibold mb-3 text-foreground">
                    {s.title}
                  </h2>
                  <div className="text-sm leading-6 text-foreground/90 space-y-3">
                    {s.body}
                  </div>
                </section>
              ))}
              <div className="h-24" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
