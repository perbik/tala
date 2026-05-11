import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogOut, UserCircle } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AuthGate } from './components/AuthGate';
import { Calendar } from './components/Calendar';
import { JournalPanel } from './components/JournalPanel';
import { SearchBar } from './components/SearchBar';
import { HeaderBanner } from './components/HeaderBanner';
import { ProfileView } from './components/ProfileView';
import { useJournal } from './hooks/useJournal';
import { warmUpModel } from './services/moodClassifier';
import { MoodType } from './types';
import { BRAND } from './constants/moods';

function JournalApp({ userEmail, userId }: { userEmail: string; userId: string }) {
    const [showProfile, setShowProfile] = useState(false);
    const {
        entries,
        loading,
        selectedDate,
        isEditing,
        currentEntry,
        selectDate,
        startEdit,
        cancelEdit,
        save,
        remove,
    } = useJournal();

    useEffect(() => { warmUpModel(); }, []);

    const handleSave = (
        title: string,
        contentHtml: string,
        photos: string[],
        mood: MoodType | null,
        confidence: number,
    ) => save(selectedDate, title, contentHtml, photos, mood, confidence);


    return (
        <div className="app-shell">

            {/* ── Top bar ── */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px', background: BRAND.navy, flexShrink: 0,
            }}>
                <img src="/Tala - Logo.svg" alt="Tala" style={{ height: 38, width: 'auto' }} />

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                    {/* Profile button */}
                    <button
                        onClick={() => setShowProfile(p => !p)}
                        title={showProfile ? 'Back to journal' : 'View profile'}
                        style={{ marginLeft: 8, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Helvetica,"Helvetica Neue",Arial,sans-serif', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    >
                        <UserCircle size={13} strokeWidth={2.5} />
                        {showProfile ? 'Journal' : 'Profile'}
                    </button>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        title="Sign out"
                        style={{
                            marginLeft: 8,
                            background: 'rgba(255,255,255,0.12)',
                            border: '1.5px solid rgba(255,255,255,0.25)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px',
                            fontSize: 11, fontWeight: 800,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    >
                        <LogOut size={12} strokeWidth={2.5} />
                        Sign out
                    </button>
                </div>
            </header>

            {/* ── Main body ── */}
            {showProfile ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <ProfileView entries={entries} userEmail={userEmail} onClose={() => setShowProfile(false)} />
                </div>
            ) : (
                <main className="app-body">
                    <aside className="left-panel">
                        <HeaderBanner />
                        <SearchBar entries={entries} onSelectEntry={selectDate} />
                        <Calendar
                            entries={entries}
                            selectedDate={selectedDate}
                            onSelectDate={selectDate}
                        />
                    </aside>

                    <section className="right-panel">
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: BRAND.navy, opacity: 0.4 }}>
                                <div style={{ width: 20, height: 20, border: `2.5px solid ${BRAND.navy}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loading entries…</span>
                            </div>
                        ) : (
                            <JournalPanel
                                selectedDate={selectedDate}
                                entry={currentEntry}
                                isEditing={isEditing}
                                userId={userId}
                                onEdit={startEdit}
                                onSave={handleSave}
                                onCancel={cancelEdit}
                                onDelete={() => remove(selectedDate)}
                            />
                        )}
                    </section>
                </main>
            )}
        </div>
    );
}

// ── Root: session gate ────────────────────────────────────────────────────────
function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        // Listen for login / logout
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (authLoading) {
        // Brief loading screen while Supabase checks the stored session
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#F4F6FB', fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
            }}>
                <div style={{ textAlign: 'center', color: BRAND.navy, opacity: 0.45 }}>
                    <div style={{
                        width: 28, height: 28, margin: '0 auto 12px',
                        border: `3px solid ${BRAND.navy}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                        Tala
                    </p>
                </div>
            </div>
        );
    }

    if (!session) return <AuthGate />;

    return <JournalApp userEmail={session.user.email ?? ''} userId={session.user.id} />;
}

export default App;
