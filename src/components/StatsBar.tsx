import React, { useMemo } from 'react';
import { TrendingUp, BookOpen, Flame, Calendar } from 'lucide-react';
import { JournalEntry, MoodType } from '../types';
import { MOOD_CONFIG, MOOD_ORDER } from '../constants/moods';
import { getMoodStats, getStreakDays } from '../services/journalStorage';

interface StatsBarProps {
  entries: Record<string, JournalEntry>;
}

export const StatsBar: React.FC<StatsBarProps> = ({ entries }) => {
  const stats = useMemo(() => getMoodStats(), [entries]);
  const streak = useMemo(() => getStreakDays(), [entries]);
  const totalEntries = Object.keys(entries).length;
  const dominantMood = useMemo(() => {
    if (totalEntries === 0) return null;
    const sorted = MOOD_ORDER.slice().sort((a, b) => stats[b] - stats[a]);
    return stats[sorted[0]] > 0 ? sorted[0] as MoodType : null;
  }, [stats, totalEntries]);

  return (
    <div className="glass-panel rounded-2xl p-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Streak */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">{streak}</p>
            <p className="text-white/50 text-xs">Day streak</p>
          </div>
        </div>

        {/* Total Entries */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">{totalEntries}</p>
            <p className="text-white/50 text-xs">Entries</p>
          </div>
        </div>
      </div>

      {/* Mood distribution bar */}
      {totalEntries > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-white/40" />
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Mood Distribution</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-2.5 gap-px">
            {MOOD_ORDER.map(mood => {
              const pct = totalEntries > 0 ? (stats[mood as MoodType] / totalEntries) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={mood}
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: MOOD_CONFIG[mood as MoodType].color }}
                  title={`${mood}: ${stats[mood as MoodType]} entries`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {MOOD_ORDER.filter(m => stats[m as MoodType] > 0).map(mood => (
              <div key={mood} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: MOOD_CONFIG[mood as MoodType].color }}
                />
                <span className="text-white/40 text-[10px] capitalize">{mood} ({stats[mood as MoodType]})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dominant mood */}
      {dominantMood && (
        <div
          className="mt-3 rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: `${MOOD_CONFIG[dominantMood].color}15` }}
        >
          <span className="text-base">{MOOD_CONFIG[dominantMood].emoji}</span>
          <div>
            <p className="text-white/80 text-xs">
              Most felt: <span className="font-semibold capitalize" style={{ color: MOOD_CONFIG[dominantMood].color }}>
                {dominantMood}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
