import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compares two semantic version strings (e.g., "1.2.3", "0.1", "2.0.0").
 * @param v1 First version string.
 * @param v2 Second version string.
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2.
 */
export function compareVersions(v1: string, v2: string): 1 | -1 | 0 {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0; // Treat missing parts as 0
    const p2 = parts2[i] || 0; // Treat missing parts as 0

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0; // Versions are equal
}
