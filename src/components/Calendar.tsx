import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalEntry } from '../types';
import { MOOD_CONFIG, MONTH_NAMES, DAYS_OF_WEEK, BRAND } from '../constants/moods';

interface CalendarProps {
  entries: Record<string, JournalEntry>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Close overlay when clicking outside of `ref` */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

export const Calendar: React.FC<CalendarProps> = ({ entries, selectedDate, onSelectDate }) => {
  const todayStr = useMemo(() => {
    const d = new Date();
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker,  setShowYearPicker]  = useState(false);

  const monthPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef  = useRef<HTMLDivElement>(null);

  useClickOutside(monthPickerRef, () => setShowMonthPicker(false));
  useClickOutside(yearPickerRef,  () => setShowYearPicker(false));

  const { year, month } = view;

  // Year range: ±6 years from current
  const currentYear = new Date().getFullYear();
  const yearRange   = Array.from({ length: 13 }, (_, i) => currentYear - 6 + i);

  // Build calendar day cells
  const days = useMemo(() => {
    const firstDow   = new Date(year, month, 1).getDay();
    const daysInMon  = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: Array<{ dateStr: string; day: number; isCurrent: boolean }> = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      cells.push({ dateStr: toDateStr(y, m, d), day: d, isCurrent: false });
    }
    for (let d = 1; d <= daysInMon; d++) {
      cells.push({ dateStr: toDateStr(year, month, d), day: d, isCurrent: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      cells.push({ dateStr: toDateStr(y, m, d), day: d, isCurrent: false });
    }
    return cells;
  }, [year, month]);

  const prevMonth = () => setView(v =>
    v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
  );
  const nextMonth = () => setView(v =>
    v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
  );

  return (
    <div className="calendar" style={{ position: 'relative' }}>

      {/* ── Month / Year Header ─────────────────────────────────── */}
      <div className="cal-header">

        {/* ── Left Year ── */}
        <button
          className="cal-header-year"
          onClick={() => { setShowYearPicker(p => !p); setShowMonthPicker(false); }}
          title="Select year"
        >
          {year}
        </button>

        {/* ── Center Month — ← [MONTH] → inside red cell ── */}
        <div style={{ position: 'relative', display: 'flex' }}>
          <div className="cal-header-month" style={{ display: 'flex', alignItems: 'center', gap: 0, padding: 0, width: '100%' }}>
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                cursor: 'pointer', padding: '10px 8px', display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>

            <button
              onClick={() => { setShowMonthPicker(p => !p); setShowYearPicker(false); }}
              title="Select month"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#fff', cursor: 'pointer', padding: '10px 2px',
                fontFamily: 'inherit', fontSize: 26, fontWeight: 900,
                letterSpacing: '0.06em', textAlign: 'center',
              }}
            >
              {MONTH_NAMES[month]}
            </button>

            <button
              onClick={nextMonth}
              aria-label="Next month"
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                cursor: 'pointer', padding: '10px 8px', display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>

          {/* Month Picker Dropdown — centered below month cell */}
          {showMonthPicker && (
            <div
              ref={monthPickerRef}
              style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                zIndex: 300, background: '#fff', border: `2px solid ${BRAND.navy}`,
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                width: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              {MONTH_SHORT.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => { setView(v => ({ ...v, month: idx })); setShowMonthPicker(false); }}
                  style={{
                    padding: '10px 4px', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
                    letterSpacing: '0.06em', textAlign: 'center',
                    background: idx === month ? BRAND.red : '#fff',
                    color:      idx === month ? '#fff'    : BRAND.navy,
                    borderBottom: `1px solid rgba(2,52,148,0.15)`,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Year — identical to left ── */}
        <button
          className="cal-header-year"
          onClick={() => { setShowYearPicker(p => !p); setShowMonthPicker(false); }}
          title="Select year"
        >
          {year}
        </button>
      </div>

      {/* Year Picker — lifted to calendar container, centered below header */}
      {showYearPicker && (
        <div
          ref={yearPickerRef}
          style={{
            position: 'absolute',
            top: 'var(--cal-header-h, 48px)',
            left: 0, right: 0,
            zIndex: 300,
            background: '#fff',
            border: `2px solid ${BRAND.navy}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {yearRange.map(y => (
            <button
              key={y}
              onClick={() => { setView(v => ({ ...v, year: y })); setShowYearPicker(false); }}
              style={{
                padding: '10px 4px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
                letterSpacing: '0.04em', textAlign: 'center',
                background: y === year ? BRAND.navy : '#fff',
                color:      y === year ? '#fff'      : BRAND.navy,
                borderBottom: `1px solid rgba(2,52,148,0.15)`,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Days-of-week row ────────────────────────────────────── */}
      <div className="cal-dow">
        {DAYS_OF_WEEK.map((dow, i) => (
          <div key={dow} className={`cal-dow-cell${i === 0 ? ' sunday' : ''}`}>{dow}</div>
        ))}
      </div>

      {/* ── Day grid ────────────────────────────────────────────── */}
      <div className="cal-grid">
        {days.map(({ dateStr, day, isCurrent }, idx) => {
          const entry     = entries[dateStr];
          const mood      = entry?.mood ?? null;
          const moodCfg   = mood ? MOOD_CONFIG[mood] : null;
          const isSelected = dateStr === selectedDate;
          const isToday   = dateStr === todayStr;
          const isSunday  = idx % 7 === 0;

          const bg       = moodCfg ? moodCfg.color : '#FFFFFF';
          const numColor = moodCfg
            ? moodCfg.textColor
            : isSunday ? BRAND.red : BRAND.navy;

          return (
            <div
              key={dateStr}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(dateStr)}
              onKeyDown={e => e.key === 'Enter' && onSelectDate(dateStr)}
              className={[
                'cal-day',
                isSunday    ? 'sunday'      : '',
                !isCurrent  ? 'other-month' : '',
                entry       ? 'has-entry'   : '',
                isSelected  ? 'selected'    : '',
              ].filter(Boolean).join(' ')}
              style={{ background: bg }}
              aria-label={`${dateStr}${mood ? ` — ${mood}` : ''}`}
              aria-selected={isSelected}
            >
              <span className="cal-day-num" style={{ color: numColor }}>
                <span className="cal-compressed">{day}</span>
              </span>



              {isToday && !mood && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 5, height: 5, borderRadius: '50%', background: BRAND.red,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
