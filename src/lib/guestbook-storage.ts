import { getSupabase, isGuestbookShared } from './supabase-client';

export const GUESTBOOK_STORAGE_KEY = 'guestbook:entries';

export type GuestbookEntry = {
  fontId: string;
  text: string;
  createdAt: number;
};

type GuestbookRow = {
  font_id: string;
  text: string;
  created_at: string;
};

function rowToEntry(row: GuestbookRow): GuestbookEntry {
  return {
    fontId: row.font_id,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function readLocalGuestbookEntries(): GuestbookEntry[] {
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

function appendLocalGuestbookEntry(entry: Omit<GuestbookEntry, 'createdAt'>) {
  const entries = readLocalGuestbookEntries();
  entries.push({ ...entry, createdAt: Date.now() });
  localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(entries));
}

/** Shared list when Supabase env is set; otherwise this device only (local dev). */
export function guestbookUsesSharedStorage(): boolean {
  return isGuestbookShared();
}

export async function readGuestbookEntries(): Promise<GuestbookEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return readLocalGuestbookEntries();
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .select('font_id, text, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToEntry(row as GuestbookRow));
}

export async function appendGuestbookEntry(entry: Omit<GuestbookEntry, 'createdAt'>) {
  const text = entry.text.trim();
  if (!text) return;

  const supabase = getSupabase();
  if (!supabase) {
    appendLocalGuestbookEntry({ fontId: entry.fontId, text });
    return;
  }

  const { error } = await supabase.from('guestbook_entries').insert({
    font_id: entry.fontId,
    text,
  });

  if (error) throw error;
}
