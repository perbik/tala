import { useState, useCallback, useEffect } from 'react';
import { JournalEntry, MoodType } from '../types';
import { getAllEntries, saveEntry, deleteEntry } from '../services/journalStorage';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export function useJournal() {
  const [entries,      setEntries]      = useState<Record<string, JournalEntry>>({});
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [isEditing,    setIsEditing]    = useState(false);

  // Load all entries from Supabase on mount
  useEffect(() => {
    getAllEntries()
      .then(e  => { setEntries(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = useCallback(async (
    date:        string,
    title:       string,
    contentHtml: string,
    photos:      string[],
    mood:        MoodType | null,
    confidence:  number,
  ) => {
    // Optimistic update — UI is snappy, DB syncs in background
    const plain = contentHtml.replace(/<[^>]*>/g, '').trim();
    const optimistic: JournalEntry = {
      id:             `tmp-${date}`,
      date,
      title,
      content:        plain,
      contentHtml,
      photos,
      mood,
      moodConfidence: confidence,
      wordCount:      plain.split(/\s+/).filter(Boolean).length,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };
    setEntries(prev => ({ ...prev, [date]: optimistic }));
    setIsEditing(false);

    // Persist — update state again with real DB record (gets the real UUID etc.)
    const entry = await saveEntry({ date, title, contentHtml, photos, mood, moodConfidence: confidence });
    setEntries(prev => ({ ...prev, [date]: entry }));
    return entry;
  }, []);

  const remove = useCallback(async (date: string) => {
    setEntries(prev => { const n = { ...prev }; delete n[date]; return n; });
    await deleteEntry(date);
  }, []);

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setIsEditing(false);
  }, []);

  return {
    entries,
    loading,
    selectedDate,
    isEditing,
    currentEntry: entries[selectedDate] ?? null,
    selectDate,
    startEdit:    () => setIsEditing(true),
    cancelEdit:   () => setIsEditing(false),
    save,
    remove,
  };
}
