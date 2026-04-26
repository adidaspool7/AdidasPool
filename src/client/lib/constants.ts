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

/**
 * ISO 3166-1 alpha-2 codes for country names that appear in adidas job
 * postings. Used by filter UIs to display "Portugal — PT". Falls back to
 * the bare name when the country isn't in the map.
 */
export const COUNTRY_ISO2: Record<string, string> = {
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  "Czech Republic": "CZ",
  Czechia: "CZ",
  Denmark: "DK",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Greece: "GR",
  "Hong Kong": "HK",
  Hungary: "HU",
  India: "IN",
  Indonesia: "ID",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Japan: "JP",
  Korea: "KR",
  "South Korea": "KR",
  Luxembourg: "LU",
  Malaysia: "MY",
  Mexico: "MX",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Norway: "NO",
  Panama: "PA",
  Peru: "PE",
  Philippines: "PH",
  Poland: "PL",
  Portugal: "PT",
  Romania: "RO",
  Russia: "RU",
  Singapore: "SG",
  Slovakia: "SK",
  "South Africa": "ZA",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Taiwan: "TW",
  Thailand: "TH",
  Turkey: "TR",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  UK: "GB",
  "United States": "US",
  USA: "US",
  Vietnam: "VN",
};

export function formatCountryLabel(name: string): string {
  const code = COUNTRY_ISO2[name];
  return code ? `${name} — ${code}` : name;
}
