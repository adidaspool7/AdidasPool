"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { ChartFromSpec, type ChartType, type WidgetDatum } from "./chart-from-spec";

interface CatalogDimension {
  key: string;
  label: string;
  family: "categorical" | "temporal" | "none";
}
interface CatalogMetric {
  key: string;
  label: string;
  description: string;
  dimensions: CatalogDimension[];
  filters: string[];
  chartTypesByFamily: Record<"categorical" | "temporal" | "none", ChartType[]>;
}
interface PublicCatalog {
  metrics: CatalogMetric[];
  chartTypes: ChartType[];
}

export interface WidgetSpec {
  metric: string;
  dimension: string;
  chartType: ChartType;
  limit?: number;
  lookbackDays?: number;
  filters?: Record<string, string | number | boolean | null>;
}

export interface SavedWidget {
  id: string;
  title: string;
  spec: WidgetSpec;
  position: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: PublicCatalog;
  /** Existing widget being edited; null for create. */
  editing: SavedWidget | null;
  onSaved: (widget: SavedWidget) => void;
}

export function WidgetBuilderDialog({
  open,
  onOpenChange,
  catalog,
  editing,
  onSaved,
}: Props) {
  const initial = editing?.spec;
  const initialMetric =
    initial?.metric ?? catalog.metrics[0]?.key ?? "candidates";

  const [metric, setMetric] = useState<string>(initialMetric);
  const [dimension, setDimension] = useState<string>(
    initial?.dimension ?? catalog.metrics[0]?.dimensions[0]?.key ?? "status"
  );
  const [chartType, setChartType] = useState<ChartType>(
    initial?.chartType ?? "bar"
  );
  const [limit, setLimit] = useState<number>(initial?.limit ?? 10);
  const [lookbackDays, setLookbackDays] = useState<number>(
    initial?.lookbackDays ?? 30
  );
  const [title, setTitle] = useState<string>(editing?.title ?? "");

  const [previewData, setPreviewData] = useState<WidgetDatum[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when reopened with different editing target
  useEffect(() => {
    if (!open) return;
    const init = editing?.spec;
    setMetric(init?.metric ?? catalog.metrics[0]?.key ?? "candidates");
    setDimension(
      init?.dimension ?? catalog.metrics[0]?.dimensions[0]?.key ?? "status"
    );
    setChartType(init?.chartType ?? "bar");
    setLimit(init?.limit ?? 10);
    setLookbackDays(init?.lookbackDays ?? 30);
    setTitle(editing?.title ?? "");
    setPreviewData([]);
    setPreviewError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const currentMetric = useMemo(
    () => catalog.metrics.find((m) => m.key === metric) ?? catalog.metrics[0],
    [catalog, metric]
  );

  const dimensionOptions = currentMetric?.dimensions ?? [];
  const currentDim = dimensionOptions.find((d) => d.key === dimension);
  const allowedChartTypes =
    (currentMetric && currentDim
      ? currentMetric.chartTypesByFamily[currentDim.family]
      : []) ?? [];

  // If metric changes, reset dimension if invalid
  useEffect(() => {
    if (!currentMetric) return;
    if (!currentMetric.dimensions.some((d) => d.key === dimension)) {
      setDimension(currentMetric.dimensions[0]?.key ?? "status");
    }
  }, [currentMetric, dimension]);

  // If chartType is invalid for the current dim family, snap to first allowed
  useEffect(() => {
    if (allowedChartTypes.length === 0) return;
    if (!allowedChartTypes.includes(chartType)) {
      setChartType(allowedChartTypes[0]);
    }
  }, [allowedChartTypes, chartType]);

  // Auto-suggest title
  useEffect(() => {
    if (editing) return;
    if (!currentMetric || !currentDim) return;
    const suggested =
      currentDim.key === "none"
        ? `Total ${currentMetric.label}`
        : `${currentMetric.label} by ${currentDim.label}`;
    setTitle((t) => (t ? t : suggested));
  }, [currentMetric, currentDim, editing]);

  const spec = useMemo<WidgetSpec>(() => {
    const s: WidgetSpec = { metric, dimension, chartType };
    if (currentDim?.family === "categorical") s.limit = limit;
    if (currentDim?.family === "temporal") s.lookbackDays = lookbackDays;
    return s;
  }, [metric, dimension, chartType, limit, lookbackDays, currentDim]);

  // Debounced live preview
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewing(true);
      setPreviewError(null);
      try {
        const res = await fetch("/api/analytics/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(spec),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? `Preview failed (${res.status})`);
        }
        const json = (await res.json()) as { data: WidgetDatum[] };
        setPreviewData(json.data ?? []);
      } catch (e) {
        setPreviewError((e as Error).message);
        setPreviewData([]);
      } finally {
        setPreviewing(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, spec]);

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing
        ? `/api/analytics/widgets/${editing.id}`
        : "/api/analytics/widgets";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, spec }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Save failed");
      }
      const { widget } = (await res.json()) as { widget: SavedWidget };
      onSaved(widget);
      onOpenChange(false);
    } catch (e) {
      setPreviewError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit chart" : "Add chart"}</DialogTitle>
          <DialogDescription>
            Compose a chart from the metrics and dimensions available in your
            talent pool.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.metrics.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Group by</Label>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dimensionOptions.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Chart type</Label>
              <Select
                value={chartType}
                onValueChange={(v) => setChartType(v as ChartType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedChartTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentDim?.family === "categorical" && (
              <div className="space-y-1.5">
                <Label>Top N (1-50)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(e) =>
                    setLimit(
                      Math.max(1, Math.min(50, Number(e.target.value) || 1))
                    )
                  }
                />
              </div>
            )}

            {currentDim?.family === "temporal" && (
              <div className="space-y-1.5">
                <Label>Look back (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={lookbackDays}
                  onChange={(e) =>
                    setLookbackDays(
                      Math.max(1, Math.min(365, Number(e.target.value) || 1))
                    )
                  }
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My chart"
              />
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Preview
              {previewing && <span className="ml-2 italic">loading…</span>}
            </div>
            {previewError ? (
              <div className="text-sm text-destructive">{previewError}</div>
            ) : (
              <ChartFromSpec
                chartType={chartType}
                data={previewData}
                height={260}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add chart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
