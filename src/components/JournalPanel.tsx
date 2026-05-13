import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, X, Loader2, Trash2, Edit3 } from 'lucide-react';
import { JournalEntry, MoodType } from '../types';
import { MOOD_CONFIG, MOOD_ORDER, BRAND } from '../constants/moods';
import { RichTextEditor } from './RichTextEditor';
import { predictMood } from '../services/moodClassifier';

interface JournalPanelProps {
    selectedDate: string;
    entry: JournalEntry | null;
    isEditing: boolean;
    userId?: string;
    onEdit: () => void;
    onSave: (title: string, contentHtml: string, photos: string[], mood: MoodType | null, confidence: number) => void;
    onCancel: () => void;
    onDelete: () => void;
}

function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        .toUpperCase();
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
    selectedDate, entry, isEditing, userId,
    onEdit, onSave, onCancel, onDelete,
}) => {
    const [title, setTitle] = useState('');
    const [contentHtml, setContentHtml] = useState('');
    const [plainText, setPlainText] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [mood, setMood] = useState<MoodType | null>(null);
    const [conf, setConf] = useState(0);
    const [analyzing, setAnalyzing] = useState(false);
    const [detectedMood, setDetectedMood] = useState<MoodType | null>(null);
    const [showDelete, setShowDelete] = useState(false);

    const analyzeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset form when entering edit mode or changing date
    useEffect(() => {
        if (isEditing) {
            setTitle(entry?.title ?? '');
            setContentHtml(entry?.contentHtml ?? '');
            setPlainText(entry?.content ?? '');
            setPhotos(entry?.photos ?? []);
            setMood(entry?.mood ?? null);
            setConf(entry?.moodConfidence ?? 0);
            setDetectedMood(null);
            setShowDelete(false);
        }
    }, [isEditing, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const analyze = useCallback(async (text: string) => {
        if (text.trim().length < 20) return;
        setAnalyzing(true);
        try {
            const res = await predictMood(text);
            setDetectedMood(res.mood);
            if (!mood) { setMood(res.mood); setConf(res.confidence); }
        } finally { setAnalyzing(false); }
    }, [mood]);

    const handleEditorChange = useCallback((html: string, plain: string) => {
        setContentHtml(html);
        setPlainText(plain);
        if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
        analyzeTimer.current = setTimeout(() => analyze(plain), 1200);
    }, [analyze]);

    const handlePhotoAdded = useCallback((base64: string) => {
        setPhotos(prev => [...prev, base64]);
    }, []);

    const handleMoodChip = (m: MoodType) => { setMood(m); setConf(1); };

    const handleSave = () => {
        // Read directly from the stored html — state may lag on first keystroke
        const hasContent = contentHtml.replace(/<[^>]*>/g, '').trim().length > 0;
        if (!hasContent && !photos.length) return;
        onSave(title, contentHtml, photos, mood, conf);
    };

    const moodCfg = mood ? MOOD_CONFIG[mood] : null;
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

    // ── VIEW MODE ─────────────────────────────────────────────────────────────
    if (!isEditing) {
        return (
            <div
                className="journal-card fade-in tala-border"
                style={{ position: 'relative' }}
            >
                {/* Date */}
                <div className="journal-date">{formatDate(selectedDate)}</div>

                {/* Title */}
                <div className="journal-title-area">
                    <div className="journal-title">{entry?.title || 'Journal'}</div>
                </div>

                {/* Divider + mood tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 18px' }}>
                    <div className="journal-divider" style={{ flex: 1, margin: 0 }} />
                    {entry?.mood && moodCfg && (
                        <span className="mood-tag" style={{ background: moodCfg.color, color: moodCfg.textColor, flexShrink: 0 }}>
                            {entry.mood.toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="journal-content-area">
                    {entry ? (
                        entry.contentHtml
                            ? (/* Rich HTML content */
                                <div
                                    className="journal-content-text"
                                    dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
                                />
                            )
                            : (/* Legacy plain-text fallback */
                                <div className="journal-content-text">
                                    {entry.content.split('\n').map((line, i) => (
                                        <p key={i} style={{ marginBottom: line ? '0.6em' : '0.3em' }}>{line || <br />}</p>
                                    ))}
                                </div>
                            )
                    ) : (
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            height: '100%', opacity: 0.35, gap: 8,
                        }}>
                            <Edit3 size={28} strokeWidth={1.5} color={BRAND.navy} />
                            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: BRAND.navy }}>
                                No entry for this day
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="journal-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {entry && (
                            <button
                                className="btn-icon"
                                onClick={() => setShowDelete(true)}
                                title="Delete entry"
                                style={{ background: 'transparent', color: BRAND.red, width: 32, height: 32, border: `2px solid ${BRAND.red}` }}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        {entry && (
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(2,52,148,0.45)', textTransform: 'uppercase' }}>
                                {entry.wordCount} words
                            </span>
                        )}
                    </div>
                    <button
                        className="btn-navy"
                        onClick={onEdit}
                        style={moodCfg ? { background: moodCfg.color, color: moodCfg.textColor } : {}}
                    >
                        {entry ? 'Edit' : 'Write'}
                    </button>
                </div>

                {/* Delete Confirm Overlay */}
                {showDelete && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.96)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', zIndex: 10,
                        border: `2px solid ${BRAND.navy}`,
                    }} className="fade-in">
                        <Trash2 size={32} color={BRAND.red} strokeWidth={1.5} />
                        <p style={{ fontSize: 18, fontWeight: 900, color: BRAND.navy, marginTop: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Delete Entry?
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(2,52,148,0.55)', margin: '6px 0 20px', fontWeight: 600 }}>
                            This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-ghost-navy" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn-navy" style={{ background: BRAND.red }} onClick={() => { onDelete(); setShowDelete(false); }}>
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── EDIT MODE ─────────────────────────────────────────────────────────────
    return (
        <div
            className="journal-card fade-in tala-border"
            style={{ overflow: 'hidden' }}
        >
            {/* Date */}
            <div className="journal-date">{formatDate(selectedDate)}</div>

            {/* Title input */}
            <div className="journal-title-area">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title"
                    maxLength={120}
                    className="journal-title"
                    style={{ display: 'block' }}
                />
            </div>

            {/* Divider */}
            <div className="journal-divider" />

            {/* Rich Text Editor (includes its own toolbar) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <RichTextEditor
                    key={selectedDate}
                    initialHtml={contentHtml}
                    placeholder="Start writing..."
                    onChange={handleEditorChange}
                    onPhotoAdded={handlePhotoAdded}
                    userId={userId}
                    entryDate={selectedDate}
                />
            </div>

            {/* AI Mood Detection */}
            <div className="ai-box">
                <div className="ai-box-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ai-label">Mood Detection</span>
                        {analyzing && <Loader2 size={12} color={BRAND.navy} style={{ animation: 'spin 1s linear infinite' }} />}
                        {detectedMood && !analyzing && (
                            <span
                                className="mood-tag"
                                style={{ background: MOOD_CONFIG[detectedMood].color, color: MOOD_CONFIG[detectedMood].textColor, fontSize: 9 }}
                            >
                                AI: {detectedMood.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(2,52,148,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {wordCount} words
                    </span>
                </div>

                {/* Mood chips */}
                <div className="mood-grid">
                    {MOOD_ORDER.map(m => {
                        const cfg = MOOD_CONFIG[m];
                        const sel = mood === m;
                        return (
                            <button
                                key={m}
                                className={`mood-chip${sel ? ' selected' : ''}`}
                                style={{
                                    borderColor: cfg.color,
                                    background: sel ? cfg.color : 'transparent',
                                    color: sel ? cfg.textColor : cfg.color,
                                }}
                                onClick={() => handleMoodChip(m)}
                            >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sel ? cfg.textColor : cfg.color, flexShrink: 0 }} />
                                {m}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="journal-footer">
                <button
                    className="btn-icon"
                    onClick={onCancel}
                    title="Cancel"
                    style={{ background: 'transparent', color: BRAND.navy, border: `2px solid ${BRAND.navy}`, width: 36, height: 36 }}
                >
                    <X size={16} />
                </button>

                <button
                    className="btn-navy"
                    onClick={handleSave}
                    style={moodCfg ? { background: moodCfg.color, color: moodCfg.textColor } : {}}
                >
                    <Save size={15} />
                    Save
                </button>
            </div>
        </div>
    );
};
