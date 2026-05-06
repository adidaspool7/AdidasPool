/**
 * Fields of work / departments.
 *
 * Canonical source of truth lives in the domain layer
 * (`@server/domain/value-objects/fields-of-work`). Re-exported here so
 * existing client code keeps importing from `@client/lib/constants`
 * without violating the layering rule (server modules now import from
 * the domain module directly).
 */
export { FIELDS_OF_WORK, type FieldOfWork } from "@server/domain/value-objects/fields-of-work";

/**
 * ISO 3166-1 alpha-2 code -> full English country name.
 * The DB stores `jobs.country` as the alpha-2 code (e.g. "PT", "US"),
 * so this map is the inverse direction of what filter UIs need.
 *
 * Note: no per-state breakdown exists for the US in our scraped data
 * (264 US jobs, all with country = "US"). If we ever start scraping the
 * state from job locations, we'd want a separate `state` column.
 */
export const COUNTRY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates",
  AR: "Argentina",
  AT: "Austria",
  AU: "Australia",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CH: "Switzerland",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CZ: "Czechia",
  DE: "Germany",
  DK: "Denmark",
  EG: "Egypt",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HK: "Hong Kong",
  HR: "Croatia",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IN: "India",
  IT: "Italy",
  JO: "Jordan",
  JP: "Japan",
  KH: "Cambodia",
  KR: "South Korea",
  KZ: "Kazakhstan",
  LT: "Lithuania",
  LU: "Luxembourg",
  MA: "Morocco",
  MX: "Mexico",
  MY: "Malaysia",
  NL: "Netherlands",
  NO: "Norway",
  NZ: "New Zealand",
  PA: "Panama",
  PE: "Peru",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  SE: "Sweden",
  SG: "Singapore",
  SK: "Slovakia",
  TH: "Thailand",
  TR: "Türkiye",
  TW: "Taiwan",
  UA: "Ukraine",
  US: "United States",
  VN: "Vietnam",
  ZA: "South Africa",
};

/**
 * Format a country code coming from the DB as "Full Name — CC".
 * Falls back to the bare value when we don't have a name for it
 * (so the UI never silently drops anything).
 */
export function formatCountryLabel(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;
  const upper = trimmed.toUpperCase();
  const name = COUNTRY_NAMES[upper];
  return name ? `${name} — ${upper}` : trimmed;
}
