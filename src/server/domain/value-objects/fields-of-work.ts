/**
 * Fields of work / departments — canonical source of truth.
 *
 * ONION LAYER: Domain (zero external deps).
 *
 * Consolidated list extracted from 1 019 synced adidas job openings.
 * Overlapping entries have been merged:
 *   - "Retail" + "Retail (Store)" → "Retail"
 *   - "Finance" + "Accounting & Finance" → "Finance"
 *   - "Supply Chain & Sourcing" + "Supply Chain Management" → "Supply Chain & Sourcing"
 *
 * Sorted alphabetically. Used by:
 *  - JD parsing prompt (job-requirements-extractor.service)
 *  - CV parsing prompt (cv-parser.service)
 *  - Validation schemas (dtos, job-requirements.schema)
 *  - Job-fit computation (job-fit.service via tagged experiences)
 *  - HR filter UIs (re-exported from @client/lib/constants)
 */
export const FIELDS_OF_WORK = [
  "Brand Management & Communications",
  "Corporate Services",
  "Data",
  "Design",
  "Digital",
  "Finance",
  "General Management & Business Development",
  "Legal & Regulatory",
  "Merchandising & Planning",
  "People & Culture",
  "Product Development & Operations",
  "Real Estate & Facilities",
  "Retail",
  "Sales",
  "Supply Chain & Sourcing",
  "Technology",
] as const;

export type FieldOfWork = (typeof FIELDS_OF_WORK)[number];
