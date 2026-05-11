import { supabase } from '../lib/supabase';
import { JournalEntry, MoodType } from '../types';

// ── Supabase row shape (snake_case) ──────────────────────────────────────────
interface EntryRow {
  id:           string;
  user_id:      string;
  date:         string;
  title:        string;
  content:      string;
  content_html: string;
  mood:         string | null;
  confidence:   number;
  word_count:   number;
  created_at:   string;
  updated_at:   string;
}

function fromRow(row: EntryRow): JournalEntry {
  return {
    id:             row.id,
    date:           row.date,
    title:          row.title,
    content:        row.content,
    contentHtml:    row.content_html,
    photos:         [],           // photos are embedded in contentHtml as base64
    mood:           (row.mood as MoodType) ?? null,
    moodConfidence: row.confidence,
    wordCount:      row.word_count,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function htmlToPlain(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? '').trim();
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAllEntries(): Promise<Record<string, JournalEntry>> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  const result: Record<string, JournalEntry> = {};
  (data as EntryRow[]).forEach(row => { result[row.date] = fromRow(row); });
  return result;
}

export async function saveEntry(
  data: Pick<JournalEntry, 'date' | 'title' | 'contentHtml' | 'photos' | 'mood' | 'moodConfidence'>
): Promise<JournalEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const plain = htmlToPlain(data.contentHtml);

  const { data: saved, error } = await supabase
    .from('entries')
    .upsert({
      user_id:      user.id,
      date:         data.date,
      title:        data.title,
      content:      plain,
      content_html: data.contentHtml,
      mood:         data.mood,
      confidence:   data.moodConfidence,
      word_count:   plain.split(/\s+/).filter(Boolean).length,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) throw error;
  return fromRow(saved as EntryRow);
}

export async function deleteEntry(date: string): Promise<void> {
  // 1. Delete the DB row
  const { error } = await supabase.from('entries').delete().eq('date', date);
  if (error) throw error;

  // 2. Delete photos from Storage under {userId}/{date}/
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const folder = `${user.id}/${date}`;
      const { data: files } = await supabase.storage
        .from('journal-photos')
        .list(folder);
      if (files && files.length > 0) {
        const paths = files.map(f => `${folder}/${f.name}`);
        await supabase.storage.from('journal-photos').remove(paths);
      }
    }
  } catch (storageErr) {
    // Non-fatal — log but don't block
    console.warn('[journalStorage] Could not clean up photos from storage:', storageErr);
  }
}

export async function searchEntries(query: string): Promise<JournalEntry[]> {
  const q = query.toLowerCase();
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as EntryRow[]).map(fromRow);
}

// ── Computed stats (from in-memory data, no extra query needed) ───────────────

export function getMoodStats(entries: Record<string, JournalEntry>) {
  const stats: Record<MoodType, number> = {
    happy: 0, sad: 0, productive: 0, tired: 0, neutral: 0, angry: 0,
  };
  Object.values(entries).forEach(e => { if (e.mood) stats[e.mood]++; });
  return stats;
}

export function getStreakDays(entries: Record<string, JournalEntry>): number {
  const dates = Object.keys(entries).sort().reverse();
  if (!dates.length) return 0;
  let streak = 0;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const entry = new Date(d); entry.setHours(0, 0, 0, 0);
    const diff = Math.round((now.getTime() - entry.getTime()) / 86400000);
    if (diff === streak) streak++; else break;
  }
  return streak;
}
