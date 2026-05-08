import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string for display.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date-time string for display.
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format a candidate's location + country without duplicating the country.
 *
 * CV parsing often persists the country both at the tail of `location`
 * (e.g. "Porto, Portugal") and again in the dedicated `country` field
 * ("Portugal"), which produced ugly strings like "Porto, Portugal, Portugal".
 *
 * @param separator Defaults to `", "`. Pass `" · "` for compact rows.
 */
export function formatLocation(
  location: string | null | undefined,
  country: string | null | undefined,
  separator: string = ", "
): string {
  const loc = (location ?? "").trim();
  const ctry = (country ?? "").trim();
  if (!loc) return ctry;
  if (!ctry) return loc;
  const locLower = loc.toLowerCase();
  const ctryLower = ctry.toLowerCase();
  if (
    locLower === ctryLower ||
    locLower.endsWith(`, ${ctryLower}`) ||
    locLower.endsWith(` ${ctryLower}`)
  ) {
    return loc;
  }
  return `${loc}${separator}${ctry}`;
}
