import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { JournalEntry } from '../types';
import { MOOD_CONFIG, BRAND } from '../constants/moods';

interface SearchBarProps {
  entries: Record<string, JournalEntry>;
  onSelectEntry: (date: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ entries, onSelectEntry }) => {
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return Object.values(entries)
      .filter(e =>
        e.title.toLowerCase().includes(lower) ||
        e.content.toLowerCase().includes(lower)
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [query, entries]);

  const select = (date: string) => {
    onSelectEntry(date);
    setQuery('');
    setFocused(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="search-box">
        <Search size={15} strokeWidth={2.5} color="rgba(2,52,148,0.45)" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          placeholder="Search entries..."
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={14} color={BRAND.navy} />
          </button>
        )}
      </div>

      {focused && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(e => {
            const cfg = e.mood ? MOOD_CONFIG[e.mood] : null;
            return (
              <div key={e.date} className="search-result-item" onMouseDown={() => select(e.date)}>
                {cfg && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: BRAND.navy, letterSpacing: '0.03em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title || 'Untitled'}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(2,52,148,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.content.slice(0, 60)}...
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(2,52,148,0.35)', flexShrink: 0, letterSpacing: '0.04em' }}>
                  {e.date}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {focused && query && results.length === 0 && (
        <div className="search-dropdown" style={{ padding: '12px 14px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(2,52,148,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            No results for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};
