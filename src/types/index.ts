// Core mood types
export type MoodType = 'happy' | 'sad' | 'productive' | 'tired' | 'neutral' | 'angry';

export interface MoodConfig {
  label: MoodType;
  emoji: string;
  color: string;
  bgClass: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export interface JournalEntry {
  id: string;
  date: string;           // YYYY-MM-DD
  title: string;
  content: string;        // plain text (for AI / search)
  contentHtml: string;    // rich HTML (for display)
  photos: string[];       // base64 encoded images
  mood: MoodType | null;
  moodConfidence: number;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export interface MoodPrediction {
  mood: MoodType;
  confidence: number;
  allScores: Record<MoodType, number>;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entry: JournalEntry | null;
}

export interface AppState {
  entries: Record<string, JournalEntry>;
  selectedDate: string;
  isEditing: boolean;
  searchQuery: string;
  currentView: 'calendar' | 'list' | 'stats';
}
