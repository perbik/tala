import React from 'react';
import { MoodType } from '../types';
import { MOOD_CONFIG } from '../constants/moods';

interface MoodBadgeProps {
  mood: MoodType;
  confidence?: number;
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({ mood, confidence }) => {
  const cfg = MOOD_CONFIG[mood];
  return (
    <span
      className="mood-tag"
      style={{ background: cfg.color, color: cfg.textColor }}
    >
      {mood.toUpperCase()}
      {confidence !== undefined && ` ${Math.round(confidence * 100)}%`}
    </span>
  );
};
