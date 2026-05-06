"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
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

  // Reset to first section every time the dialog opens
  useEffect(() => {
    if (open) {
      setActiveId(sections[0]?.id ?? "");
      // Scroll content to top after dialog mounts
      requestAnimationFrame(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      });
    }
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
          <aside className="border-r bg-muted/30 overflow-y-auto py-3">
            <nav className="px-2 space-y-0.5">
              {sections.map((s, idx) => (
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
                  <span className="text-xs opacity-70 mr-2">{idx + 1}.</span>
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

const candidateGuideSections: GuideSection[] = [
  {
    id: "coming-soon",
    title: "Coming soon",
    body: (
      <p className="text-muted-foreground">
        The candidate guide is being prepared and will be available shortly.
      </p>
    ),
  },
];
