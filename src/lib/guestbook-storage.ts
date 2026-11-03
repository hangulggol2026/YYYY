export const GUESTBOOK_STORAGE_KEY = 'guestbook:entries';

export type GuestbookEntry = {
  fontId: string;
  text: string;
  createdAt: number;
};

export function readGuestbookEntries(): GuestbookEntry[] {
  try {
    const raw = localStorage.getItem(GUESTBOOK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GuestbookEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as GuestbookEntry).text === 'string' &&
        typeof (item as GuestbookEntry).fontId === 'string',
    );
  } catch {
    return [];
  }
}

export function appendGuestbookEntry(entry: Omit<GuestbookEntry, 'createdAt'>) {
  const entries = readGuestbookEntries();
  entries.push({ ...entry, createdAt: Date.now() });
  localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(entries));
}
