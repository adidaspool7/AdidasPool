/**
 * Supabase HR Dashboard Widget Repository
 *
 * ONION LAYER: Infrastructure
 *
 * Persists per-user custom analytics widgets. The `spec` JSONB is
 * trusted to be valid here — validation happens in the use-case layer
 * before any write.
 */

import db from "./supabase-client";
import { camelizeKeys, generateId, assertNoError } from "./db-utils";
import type {
  IDashboardWidgetRepository,
  DashboardWidget,
} from "@server/domain/ports/repositories";

export class SupabaseDashboardWidgetRepository implements IDashboardWidgetRepository {
  async listForUser(userId: string): Promise<DashboardWidget[]> {
    const { data, error } = await db
      .from("hr_dashboard_widgets")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    assertNoError(error, "dashboardWidgets.listForUser");
    return (data ?? []).map((r) =>
      camelizeKeys<DashboardWidget>(r as Record<string, unknown>)
    );
  }

  async findById(id: string): Promise<DashboardWidget | null> {
    const { data, error } = await db
      .from("hr_dashboard_widgets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "dashboardWidgets.findById");
    return data
      ? camelizeKeys<DashboardWidget>(data as Record<string, unknown>)
      : null;
  }

  async create(data: {
    userId: string;
    title: string;
    spec: Record<string, unknown>;
    position?: number;
  }): Promise<DashboardWidget> {
    const { data: row, error } = await db
      .from("hr_dashboard_widgets")
      .insert({
        id: generateId(),
        user_id: data.userId,
        title: data.title,
        spec: data.spec,
        position: data.position ?? 0,
      })
      .select("*")
      .single();
    assertNoError(error, "dashboardWidgets.create");
    return camelizeKeys<DashboardWidget>(row as Record<string, unknown>);
  }

  async update(
    id: string,
    userId: string,
    data: Partial<{ title: string; spec: Record<string, unknown>; position: number }>
  ): Promise<DashboardWidget | null> {
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.spec !== undefined) update.spec = data.spec;
    if (data.position !== undefined) update.position = data.position;

    const { data: row, error } = await db
      .from("hr_dashboard_widgets")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    assertNoError(error, "dashboardWidgets.update");
    return row
      ? camelizeKeys<DashboardWidget>(row as Record<string, unknown>)
      : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { error, count } = await db
      .from("hr_dashboard_widgets")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId);
    assertNoError(error, "dashboardWidgets.delete");
    return (count ?? 0) > 0;
  }

  async maxPositionForUser(userId: string): Promise<number> {
    const { data, error } = await db
      .from("hr_dashboard_widgets")
      .select("position")
      .eq("user_id", userId)
      .order("position", { ascending: false })
      .limit(1);
    assertNoError(error, "dashboardWidgets.maxPositionForUser");
    if (!data || data.length === 0) return -1;
    return ((data[0] as { position: number }).position ?? -1) as number;
  }
}
