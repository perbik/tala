import React, { useMemo, useState } from 'react';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { ArrowLeft } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { JournalEntry, MoodType } from '../types';
import { BRAND, MOOD_CONFIG, MOOD_ORDER } from '../constants/moods';

const MOOD_SCORE: Record<MoodType, number> = {
    happy: 5, productive: 4, neutral: 3, tired: 2, sad: 1, angry: 0,
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was',
    'i', 'my', 'me', 'we', 'it', 'its', 'this', 'that', 'be', 'are', 'have', 'had', 'do', 'did',
    'so', 'as', 'if', 'by', 'from', 'not', 'no', 'he', 'she', 'they', 'them', 'their', 'you', 'your',
    'just', 'like', 'get', 'got', 'can', 'will', 'been', 'has', 'were', 'would', 'could', 'should',
    'up', 'out', 'about', 'all', 'what', 'when', 'then', 'there', 'here', 'how', 'more', 'one', 'day',
    'feel', 'felt', 'really', 'very', 'also', 'still', 'even', 'back', 'time', 'some', 'after',
]);

function swatch(color: string) {
    return { display: 'inline-block', width: 10, height: 10, background: color, border: `1px solid ${BRAND.navy}`, marginRight: 5, flexShrink: 0 };
}

const card: React.CSSProperties = {
    background: '#fff', border: `2px solid ${BRAND.navy}`, padding: '18px 20px', marginBottom: 16,
};
const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(2,52,148,0.45)', marginBottom: 10, display: 'block',
};
const bigNum: React.CSSProperties = {
    fontSize: 28, fontWeight: 900, color: BRAND.navy, lineHeight: 1,
};
const smallLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'rgba(2,52,148,0.45)', marginTop: 3,
};

export const InsightsView: React.FC<{
    entries: Record<string, JournalEntry>;
    onClose: () => void;
}> = ({ entries, onClose }) => {
    const [range, setRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

    const allEntries = useMemo(() => Object.values(entries).sort((a, b) => a.date.localeCompare(b.date)), [entries]);

    /* ── Filter by range ── */
    const filtered = useMemo(() => {
        if (range === 'all') return allEntries;
        const months = range === '3m' ? 3 : range === '6m' ? 6 : 12;
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);
        const cutStr = cutoff.toISOString().slice(0, 10);
        return allEntries.filter(e => e.date >= cutStr);
    }, [allEntries, range]);

    /* ── Weekly mood trend ── */
    const weeklyTrend = useMemo(() => {
        const weeks: Record<string, { scores: number[], label: string }> = {};
        filtered.forEach(e => {
            if (!e.mood) return;
            const d = new Date(e.date + 'T00:00:00');
            const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            const key = mon.toISOString().slice(0, 10);
            if (!weeks[key]) weeks[key] = { scores: [], label: mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
            weeks[key].scores.push(MOOD_SCORE[e.mood]);
        });
        return Object.entries(weeks)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, { scores, label }]) => ({ label, avg: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) }));
    }, [filtered]);

    /* ── Monthly entries bar ── */
    const monthlyBars = useMemo(() => {
        const map: Record<string, number> = {};
        filtered.forEach(e => {
            const key = e.date.slice(0, 7);
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
            label: `${MONTHS[+k.slice(5, 7) - 1]} '${k.slice(2, 4)}`, count: v,
        }));
    }, [filtered]);

    /* ── Mood distribution ── */
    const moodDist = useMemo(() => {
        const counts: Record<MoodType, number> = { happy: 0, sad: 0, productive: 0, tired: 0, neutral: 0, angry: 0 };
        filtered.forEach(e => { if (e.mood) counts[e.mood]++; });
        return MOOD_ORDER.filter(m => counts[m] > 0).map(m => ({ name: m, value: counts[m], color: MOOD_CONFIG[m].color }));
    }, [filtered]);

    /* ── Day of week ── */
    const dowCounts = useMemo(() => {
        const c = [0, 0, 0, 0, 0, 0, 0];
        filtered.forEach(e => { const d = new Date(e.date + 'T00:00:00'); c[d.getDay()]++; });
        const max = Math.max(...c, 1);
        return DAYS.map((d, i) => ({ day: d, count: c[i], pct: c[i] / max }));
    }, [filtered]);

    /* ── Writing stats ── */
    const writingStats = useMemo(() => {
        if (!filtered.length) return { avg: 0, max: 0, total: 0, totalWords: 0, bestMood: null as MoodType | null };
        const wc = filtered.map(e => e.wordCount || 0);
        const totalWords = wc.reduce((a, b) => a + b, 0);
        const moodWC: Record<MoodType, number[]> = { happy: [], sad: [], productive: [], tired: [], neutral: [], angry: [] };
        filtered.forEach(e => { if (e.mood) moodWC[e.mood].push(e.wordCount || 0); });
        let bestMood: MoodType | null = null, bestAvg = -1;
        (Object.entries(moodWC) as [MoodType, number[]][]).forEach(([m, arr]) => {
            if (!arr.length) return;
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            if (avg > bestAvg) { bestAvg = avg; bestMood = m; }
        });
        return {
            avg: Math.round(totalWords / filtered.length),
            max: Math.max(...wc),
            total: filtered.length,
            totalWords,
            bestMood,
        };
    }, [filtered]);

    /* ── Top words ── */
    const topWords = useMemo(() => {
        const freq: Record<string, number> = {};
        filtered.forEach(e => {
            const words = (e.content || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
            words.forEach(w => { if (w.length > 3 && !STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
        });
        return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 24).map(([w, c]) => ({ w, c }));
    }, [filtered]);

    /* ── Mood confidence avg ── */
    const avgConf = useMemo(() => {
        const vals = filtered.filter(e => e.moodConfidence > 0).map(e => e.moodConfidence);
        if (!vals.length) return 0;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
    }, [filtered]);

    const ff = 'Helvetica,"Helvetica Neue",Arial,sans-serif';
    const ttStyle = { background: '#fff', border: `1.5px solid ${BRAND.navy}`, borderRadius: 0, fontFamily: ff, fontSize: 11, fontWeight: 700, color: BRAND.navy };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: '#F4F6FB', fontFamily: ff }}>

            {/* Header */}
            <div style={{ background: BRAND.navy, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Insights</span>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', padding: '4px 12px', cursor: 'pointer', fontFamily: ff, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ArrowLeft size={13} strokeWidth={2.5} /> Journal
                </button>
            </div>

            <div style={{ padding: '20px 28px', flex: 1 }}>

                {/* Range selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, alignItems: 'center' }}>
                    <span style={label}>Period</span>
                    {(['3m', '6m', '1y', 'all'] as const).map(r => (
                        <button key={r} onClick={() => setRange(r)} style={{ background: r === range ? BRAND.navy : '#fff', color: r === range ? '#fff' : BRAND.navy, border: `2px solid ${BRAND.navy}`, padding: '4px 12px', fontFamily: ff, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer' }}>
                            {r === 'all' ? 'All' : r.toUpperCase()}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
                        <p style={{ color: 'rgba(2,52,148,0.4)', fontWeight: 700, fontSize: 13 }}>No entries in this period.</p>
                    </div>
                ) : (<>

                    {/* KPI Row */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                        {[
                            { l: 'Entries', v: writingStats.total },
                            { l: 'Total Words', v: writingStats.totalWords.toLocaleString() },
                            { l: 'Avg Words/Entry', v: writingStats.avg },
                            { l: 'Longest Entry', v: writingStats.max + ' w' },
                            { l: 'AI Confidence', v: avgConf + '%' },
                            { l: 'Most Wordy Mood', v: writingStats.bestMood ?? '—' },
                        ].map(({ l, v }) => (
                            <div key={l} style={{ ...card, marginBottom: 0, minWidth: 110, flex: 1 }}>
                                <div style={bigNum}>{v}</div>
                                <div style={smallLabel}>{l}</div>
                            </div>
                        ))}
                    </div>

                    {/* Mood Trend + Mood Distribution */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 0 }}>

                        {/* Mood Trend */}
                        <div style={card}>
                            <span style={label}>Weekly Mood Score (0 = Angry · 5 = Happy)</span>
                            {weeklyTrend.length < 2 ? (
                                <p style={{ color: 'rgba(2,52,148,0.35)', fontSize: 11, fontWeight: 600 }}>Need at least 2 weeks of data.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={weeklyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,52,148,0.08)" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: 'rgba(2,52,148,0.5)', fontFamily: ff }} tickLine={false} axisLine={{ stroke: BRAND.navy }} />
                                        <YAxis domain={[0, 5]} tick={{ fontSize: 9, fontWeight: 700, fill: 'rgba(2,52,148,0.5)', fontFamily: ff }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={ttStyle} formatter={(v: ValueType | undefined) => [v ?? 0, 'Mood Score']} />
                                        <Line type="monotone" dataKey="avg" stroke={BRAND.navy} strokeWidth={2.5} dot={{ fill: BRAND.navy, r: 3 }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Mood Distribution Donut */}
                        <div style={card}>
                            <span style={label}>Mood Distribution</span>
                            {moodDist.length === 0 ? (
                                <p style={{ color: 'rgba(2,52,148,0.35)', fontSize: 11, fontWeight: 600 }}>No moods recorded.</p>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie data={moodDist} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={1.5} stroke={BRAND.navy}>
                                                {moodDist.map((m, i) => <Cell key={i} fill={m.color} />)}
                                            </Pie>
                                            <Tooltip contentStyle={ttStyle} formatter={(v: ValueType | undefined, n: NameType | undefined) => [(v ?? 0) + ' entries', n ?? '']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 6 }}>
                                        {moodDist.map(m => (
                                            <div key={m.name} style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: BRAND.navy }}>
                                                <span style={swatch(m.color) as React.CSSProperties} />
                                                {m.name} ({m.value})
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Monthly Entries + Day of Week */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, marginTop: 16 }}>

                        {/* Monthly Bar Chart */}
                        <div style={card}>
                            <span style={label}>Entries Per Month</span>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={monthlyBars} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,52,148,0.08)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: 'rgba(2,52,148,0.5)', fontFamily: ff }} tickLine={false} axisLine={{ stroke: BRAND.navy }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: 'rgba(2,52,148,0.5)', fontFamily: ff }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={ttStyle} formatter={(v: ValueType | undefined) => [v ?? 0, 'Entries']} />
                                    <Bar dataKey="count" fill={BRAND.navy} radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Day of Week Heatmap */}
                        <div style={card}>
                            <span style={label}>Most Active Days</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {dowCounts.map(({ day, count, pct }) => (
                                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 28, fontSize: 10, fontWeight: 800, color: 'rgba(2,52,148,0.5)', textAlign: 'right' }}>{day}</span>
                                        <div style={{ flex: 1, height: 14, background: 'rgba(2,52,148,0.07)', position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct * 100}%`, background: BRAND.navy, transition: 'width 0.4s' }} />
                                        </div>
                                        <span style={{ width: 20, fontSize: 10, fontWeight: 800, color: BRAND.navy, textAlign: 'right' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Words */}
                    <div style={{ ...card, marginTop: 16 }}>
                        <span style={label}>Most Used Words in Your Entries</span>
                        {topWords.length === 0 ? (
                            <p style={{ color: 'rgba(2,52,148,0.35)', fontSize: 11, fontWeight: 600 }}>No words found yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                                {topWords.map(({ w, c }, i) => {
                                    const maxC = topWords[0].c;
                                    const size = 10 + Math.round((c / maxC) * 16);
                                    const opacity = 0.4 + (c / maxC) * 0.6;
                                    return (
                                        <span key={i} style={{ fontSize: size, fontWeight: 900, color: BRAND.navy, opacity, lineHeight: 1.3, letterSpacing: '0.02em', cursor: 'default', transition: 'opacity 0.2s' }}
                                            title={`${w}: ${c} times`}>
                                            {w}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Mood–Writing Correlation */}
                    <div style={{ ...card, marginTop: 16 }}>
                        <span style={label}>Average Word Count by Mood</span>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {MOOD_ORDER.map(m => {
                                const mEntries = filtered.filter(e => e.mood === m);
                                if (!mEntries.length) return null;
                                const avg = Math.round(mEntries.reduce((a, e) => a + (e.wordCount || 0), 0) / mEntries.length);
                                const maxAvg = Math.max(...MOOD_ORDER.map(mm => {
                                    const me = filtered.filter(e => e.mood === mm);
                                    return me.length ? me.reduce((a, e) => a + (e.wordCount || 0), 0) / me.length : 0;
                                }));
                                const pct = maxAvg > 0 ? avg / maxAvg : 0;
                                return (
                                    <div key={m} style={{ minWidth: 90, background: 'rgba(2,52,148,0.04)', border: `1.5px solid ${MOOD_CONFIG[m].color}`, padding: '10px 14px' }}>
                                        <div style={{ width: '100%', height: 4, background: 'rgba(2,52,148,0.1)', marginBottom: 8 }}>
                                            <div style={{ width: `${pct * 100}%`, height: '100%', background: MOOD_CONFIG[m].color }} />
                                        </div>
                                        <div style={{ fontSize: 20, fontWeight: 900, color: BRAND.navy }}>{avg}</div>
                                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(2,52,148,0.45)', marginTop: 2 }}>{m}</div>
                                        <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(2,52,148,0.35)', marginTop: 1 }}>{mEntries.length} entr{mEntries.length !== 1 ? 'ies' : 'y'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </>)}
            </div>
        </div>
    );
};
