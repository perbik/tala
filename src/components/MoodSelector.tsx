import React from 'react';
import { MoodType } from '../types';
import { MOOD_CONFIG, MOOD_ORDER } from '../constants/moods';

interface MoodSelectorProps {
  selected: MoodType | null;
  onChange: (mood: MoodType) => void;
  compact?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selected, onChange, compact = false }) => {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'gap-3'}`}>
      {MOOD_ORDER.map(mood => {
        const config = MOOD_CONFIG[mood];
        const isSelected = selected === mood;

        return (
          <button
            key={mood}
            onClick={() => onChange(mood)}
            className={`mood-chip ${isSelected ? 'selected' : ''}`}
            style={{
              borderColor: isSelected ? config.color : 'rgba(255,255,255,0.2)',
              background: isSelected
                ? `${config.color}30`
                : 'rgba(255,255,255,0.05)',
              color: isSelected ? config.color : 'rgba(255,255,255,0.6)',
              boxShadow: isSelected ? `0 0 12px ${config.color}50` : 'none',
            }}
            title={config.description}
          >
            <span className="text-base leading-none">{config.emoji}</span>
            <span className={`capitalize font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
              {mood}
            </span>
          </button>
        );
      })}
    </div>
  );
};
