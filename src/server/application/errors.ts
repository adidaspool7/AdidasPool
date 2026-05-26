/**
 * Application-layer error classes.
 *
 * ONION LAYER: Application
 *
 * Centralised here so every use-case file imports from one place
 * rather than re-defining or cross-importing from each other.
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Thrown by the bulk-upload pipeline when a CV belongs to an already-known candidate. */
export class DuplicateSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateSkipError";
  }
}

/** Thrown when a dashboard widget spec fails catalog validation. */
export class WidgetSpecValidationError extends Error {
  constructor(public readonly issues: unknown) {
    super("Invalid widget spec");
    this.name = "WidgetSpecValidationError";
  }
}
