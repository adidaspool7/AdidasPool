/**
 * Consolidated list of fields of work / departments extracted from
 * 1 019 synced adidas job openings.
 *
 * Overlapping entries have been merged:
 *   - "Retail" + "Retail (Store)" → "Retail"
 *   - "Finance" + "Accounting & Finance" → "Finance"
 *   - "Supply Chain & Sourcing" + "Supply Chain Management" → "Supply Chain & Sourcing"
 *
 * Sorted alphabetically.
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
