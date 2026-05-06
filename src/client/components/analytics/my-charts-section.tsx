"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/components/ui/alert-dialog";
import { ChartFromSpec, type WidgetDatum } from "./chart-from-spec";
import {
  WidgetBuilderDialog,
  type SavedWidget,
} from "./widget-builder-dialog";

interface PublicCatalog {
  metrics: Array<{
    key: string;
    label: string;
    description: string;
    dimensions: Array<{
      key: string;
      label: string;
      family: "categorical" | "temporal" | "none";
    }>;
    filters: string[];
    chartTypesByFamily: Record<
      "categorical" | "temporal" | "none",
      Array<"bar" | "hbar" | "pie" | "line" | "area" | "stat">
    >;
  }>;
  chartTypes: Array<"bar" | "hbar" | "pie" | "line" | "area" | "stat">;
}

interface WidgetWithData extends SavedWidget {
  data: WidgetDatum[];
  loading: boolean;
  error: string | null;
}

export function MyChartsSection() {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [widgets, setWidgets] = useState<WidgetWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<SavedWidget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SavedWidget | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, listRes] = await Promise.all([
          fetch("/api/analytics/catalog"),
          fetch("/api/analytics/widgets"),
        ]);
        if (catRes.status === 401 || catRes.status === 403) {
          if (!cancelled) setAccessDenied(true);
          return;
        }
        if (!catRes.ok) throw new Error("Catalog fetch failed");
        if (!listRes.ok) throw new Error("Widget list fetch failed");
        const cat = (await catRes.json()) as PublicCatalog;
        const list = (await listRes.json()) as { widgets: SavedWidget[] };
        if (cancelled) return;
        setCatalog(cat);
        const enriched: WidgetWithData[] = list.widgets.map((w) => ({
          ...w,
          data: [],
          loading: true,
          error: null,
        }));
        setWidgets(enriched);
        // Fetch data for each widget in parallel
        await Promise.all(
          enriched.map(async (w) => {
            try {
              const r = await fetch("/api/analytics/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(w.spec),
              });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const j = (await r.json()) as { data: WidgetDatum[] };
              if (cancelled) return;
              setWidgets((prev) =>
                prev.map((p) =>
                  p.id === w.id
                    ? { ...p, data: j.data ?? [], loading: false }
                    : p
                )
              );
            } catch (e) {
              if (cancelled) return;
              setWidgets((prev) =>
                prev.map((p) =>
                  p.id === w.id
                    ? { ...p, error: (e as Error).message, loading: false }
                    : p
                )
              );
            }
          })
        );
      } catch {
        // swallow — section just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (accessDenied) return null;

  function handleSaved(saved: SavedWidget) {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved, loading: true, error: null };
        return next;
      }
      return [...prev, { ...saved, data: [], loading: true, error: null }];
    });
    // Re-run query for the saved widget
    fetch("/api/analytics/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved.spec),
    })
      .then((r) => r.json())
      .then((j: { data: WidgetDatum[] }) => {
        setWidgets((prev) =>
          prev.map((p) =>
            p.id === saved.id ? { ...p, data: j.data ?? [], loading: false } : p
          )
        );
      })
      .catch((e) => {
        setWidgets((prev) =>
          prev.map((p) =>
            p.id === saved.id
              ? { ...p, error: (e as Error).message, loading: false }
              : p
          )
        );
      });
  }

  async function handleDelete(w: SavedWidget) {
    const res = await fetch(`/api/analytics/widgets/${w.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setWidgets((prev) => prev.filter((p) => p.id !== w.id));
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My charts</h2>
          <p className="text-sm text-muted-foreground">
            Custom charts you build and save. Only you see them.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setBuilderOpen(true);
          }}
          disabled={!catalog}
        >
          + Add chart
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : widgets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No custom charts yet. Click <strong>+ Add chart</strong> to create your
            first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {widgets.map((w) => (
            <Card key={w.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{w.title}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(w);
                      setBuilderOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(w)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {w.loading ? (
                  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : w.error ? (
                  <div className="flex h-[280px] items-center justify-center text-sm text-destructive">
                    {w.error}
                  </div>
                ) : (
                  <ChartFromSpec
                    chartType={w.spec.chartType}
                    data={w.data}
                    height={280}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {catalog && (
        <WidgetBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          catalog={catalog}
          editing={editing}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chart?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title} will be permanently removed from your
              dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
