"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";
import { Button } from "@client/components/ui/button";

const STORAGE_KEY = "adidas_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. private mode with strict settings)
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, at: new Date().toISOString() }));
    } catch {
      // best-effort
    }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, at: new Date().toISOString() }));
    } catch {
      // best-effort
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-2xl"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Icon + text */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-adihaus-bold text-sm uppercase tracking-wide">
              We use cookies
            </p>
            <p className="font-adihaus-regular text-xs text-muted-foreground">
              This platform uses strictly necessary session cookies to keep you
              signed in and remember your preferences. No tracking or advertising
              cookies are set.{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Learn more in our Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={decline}
            className="font-adihaus-regular text-xs text-muted-foreground"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={accept}
            className="font-adihaus-bold text-xs uppercase tracking-wide"
          >
            Accept all
          </Button>
          <button
            onClick={decline}
            aria-label="Dismiss cookie banner"
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
