import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a datetime string stored as IST (no timezone) that may have a
 * trailing 'Z' or tz-offset appended by the DB/pg driver.
 * Strips the suffix so the browser reads the raw value as local/IST time.
 */
export function parseIST(dateStr: string): Date {
  const naive = dateStr.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  return new Date(naive);
}

/** Convert "HH:MM" string → "H:MM AM/PM" */
export function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Format a datetime string (stored as IST) → "H:MM AM/PM" */
export function formatDateTime12(dateStr: string): string {
  return parseIST(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
