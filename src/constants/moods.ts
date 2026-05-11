import { MoodConfig, MoodType } from '../types';

// ── Exact colors from user spec ──────────────────────────────────────────────
export const BRAND = {
  navy:      '#023494',
  red:       '#DE0100',
} as const;

export const MOOD_CONFIG: Record<MoodType, MoodConfig> = {
  happy: {
    label:       'happy',
    emoji:       '☀',
    color:       '#D7DE00',   // yellow
    bgClass:     'mood-happy',
    textColor:   '#023494',   // navy text on yellow
    borderColor: '#D7DE00',
    description: 'Feeling joyful and positive',
  },
  sad: {
    label:       'sad',
    emoji:       '~',
    color:       '#008DDE',   // blue
    bgClass:     'mood-sad',
    textColor:   '#FFFFFF',
    borderColor: '#008DDE',
    description: 'Feeling down or melancholic',
  },
  productive: {
    label:       'productive',
    emoji:       '/',
    color:       '#00DE30',   // green
    bgClass:     'mood-productive',
    textColor:   '#023494',
    borderColor: '#00DE30',
    description: 'In the zone and getting things done',
  },
  tired: {
    label:       'tired',
    emoji:       'z',
    color:       '#6F00DE',   // purple
    bgClass:     'mood-tired',
    textColor:   '#FFFFFF',
    borderColor: '#6F00DE',
    description: 'Feeling exhausted or drained',
  },
  neutral: {
    label:       'neutral',
    emoji:       '-',
    color:       '#DE6B00',   // orange
    bgClass:     'mood-neutral',
    textColor:   '#FFFFFF',
    borderColor: '#DE6B00',
    description: 'Neither good nor bad',
  },
  angry: {
    label:       'angry',
    emoji:       '!',
    color:       '#990303',   // maroon
    bgClass:     'mood-angry',
    textColor:   '#FFFFFF',
    borderColor: '#990303',
    description: 'Feeling frustrated or upset',
  },
};

export const MOOD_ORDER: MoodType[] = ['happy', 'productive', 'neutral', 'tired', 'sad', 'angry'];

export const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];
