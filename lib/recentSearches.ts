/**
 * Utility for persisting and managing user's recent search queries in localStorage.
 */

const RECENT_SEARCHES_KEY = "heygarlic_recent_searches";
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, MAX_RECENT_SEARCHES);
    }
  } catch {}
  return [];
}

export function saveRecentSearch(term: string): string[] {
  if (typeof window === "undefined" || !term || !term.trim()) return [];
  try {
    const trimmed = term.trim();
    const existing = getRecentSearches();
    // Remove if already exists (case-insensitive deduplication)
    const filtered = existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
    // Prepend the new search term to the top
    const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s.toLowerCase() !== term.trim().toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}

