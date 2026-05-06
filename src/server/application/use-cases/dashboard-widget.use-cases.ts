/**
 * Dashboard Widget Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only).
 *
 * Validates incoming widget specs against the analytics catalog,
 * delegates query execution to the infrastructure runner, and manages
 * per-user widget CRUD.
 */

import {
  WidgetSpecSchema,
  buildPublicCatalog,
  type WidgetSpec,
  type WidgetQueryResult,
  type PublicCatalog,
} from "@server/domain/services/analytics-catalog";
import type {
  IDashboardWidgetRepository,
  DashboardWidget,
} from "@server/domain/ports/repositories";

export class WidgetSpecValidationError extends Error {
  constructor(public readonly issues: unknown) {
    super("Invalid widget spec");
    this.name = "WidgetSpecValidationError";
  }
}

export class DashboardWidgetUseCases {
  constructor(
    private readonly widgetRepo: IDashboardWidgetRepository,
    private readonly queryRunner: (spec: WidgetSpec) => Promise<WidgetQueryResult>
  ) {}

  /** Public catalog the UI consumes to build the chart picker. */
  getCatalog(): PublicCatalog {
    return buildPublicCatalog();
  }

  /** Validate a raw spec object. Throws on invalid input. */
  validateSpec(raw: unknown): WidgetSpec {
    const parsed = WidgetSpecSchema.safeParse(raw);
    if (!parsed.success) {
      throw new WidgetSpecValidationError(parsed.error.issues);
    }
    return parsed.data;
  }

  /** Validate + execute. Used both for live preview and rendering saved widgets. */
  async runQuery(rawSpec: unknown): Promise<WidgetQueryResult> {
    const spec = this.validateSpec(rawSpec);
    return this.queryRunner(spec);
  }

  // ----- CRUD -----

  async listForUser(userId: string): Promise<DashboardWidget[]> {
    return this.widgetRepo.listForUser(userId);
  }

  async createForUser(
    userId: string,
    input: { title: string; spec: unknown }
  ): Promise<DashboardWidget> {
    const spec = this.validateSpec(input.spec);
    const title = (input.title ?? "").trim().slice(0, 120);
    if (!title) throw new WidgetSpecValidationError([{ message: "Title is required" }]);
    const nextPosition = (await this.widgetRepo.maxPositionForUser(userId)) + 1;
    return this.widgetRepo.create({
      userId,
      title,
      spec: spec as unknown as Record<string, unknown>,
      position: nextPosition,
    });
  }

  async updateForUser(
    id: string,
    userId: string,
    input: Partial<{ title: string; spec: unknown; position: number }>
  ): Promise<DashboardWidget | null> {
    const update: Partial<{ title: string; spec: Record<string, unknown>; position: number }> = {};
    if (input.title !== undefined) {
      const t = input.title.trim().slice(0, 120);
      if (!t) throw new WidgetSpecValidationError([{ message: "Title is required" }]);
      update.title = t;
    }
    if (input.spec !== undefined) {
      const validated = this.validateSpec(input.spec);
      update.spec = validated as unknown as Record<string, unknown>;
    }
    if (input.position !== undefined) {
      if (!Number.isFinite(input.position)) {
        throw new WidgetSpecValidationError([{ message: "Position must be a number" }]);
      }
      update.position = Math.max(0, Math.floor(input.position));
    }
    return this.widgetRepo.update(id, userId, update);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    return this.widgetRepo.delete(id, userId);
  }
}
