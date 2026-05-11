import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { JournalEntry, MoodType } from '../types';
import { BRAND, MOOD_CONFIG } from '../constants/moods';

const MOODS: MoodType[] = ['happy', 'productive', 'neutral', 'tired', 'sad', 'angry'];
const CELL    = 14;   // cell size px
const GAP     = 2;    // gap px
const NAME_KEY = 'tala_display_name';

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Build full-year grid ──────────────────────────────────────────────────── */
function buildGrid(year: number, entries: Record<string, JournalEntry>) {
  const today  = new Date(); today.setHours(0,0,0,0);
  const jan1   = new Date(year, 0, 1);
  const dec31  = new Date(year, 11, 31);

  // start = Sunday of the week containing Jan 1
  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay());

  // end = Saturday of the week containing Dec 31
  const end = new Date(dec31);
  end.setDate(dec31.getDate() + (6 - dec31.getDay()));

  const weeks: Array<Array<{
    dateStr: string; mood: MoodType | null;
    inYear: boolean; future: boolean;
  }>> = [];
  const monthLabels: Array<{ weekIdx: number; label: string }> = [];

  const cur = new Date(start);
  let weekIdx = 0;
  let lastMonth = -1;

  while (cur <= end) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = fmtDate(cur);
      const inYear  = cur.getFullYear() === year;

      if (d === 0 && inYear && cur.getMonth() !== lastMonth) {
        lastMonth = cur.getMonth();
        monthLabels.push({ weekIdx, label: cur.toLocaleDateString('en-US', { month: 'short' }) });
      }
      week.push({
        dateStr,
        mood:   inYear ? (entries[dateStr]?.mood ?? null) : null,
        inYear,
        future: cur > today,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    weekIdx++;
  }
  return { weeks, monthLabels };
}

/* ── Banner read from localStorage ──────────────────────────────────────────── */
function BannerDisplay() {
  const data = useMemo(() => {
    try { const r = localStorage.getItem('moodjournal_banner'); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }, []);
  const bg = data?.imageBase64
    ? `url("${data.imageBase64}") center/cover no-repeat`
    : (data?.bgColor ?? BRAND.navy);
  return <div style={{ height:100, background:bg, flexShrink:0 }} />;
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export const ProfileView: React.FC<{
  entries:   Record<string, JournalEntry>;
  userEmail: string;
  onClose:   () => void;
}> = ({ entries, userEmail, onClose }) => {
  const emailName = userEmail.split('@')[0];

  /* editable display name */
  const [name,        setName]        = useState(() => localStorage.getItem(NAME_KEY) ?? emailName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft,   setNameDraft]   = useState(name);
  const saveName  = () => { const v = nameDraft.trim()||emailName; setName(v); localStorage.setItem(NAME_KEY,v); setEditingName(false); };
  const cancelName= () => { setNameDraft(name); setEditingName(false); };

  /* year selection */
  const availableYears = useMemo(() => {
    const s = new Set<number>([new Date().getFullYear()]);
    Object.keys(entries).forEach(d => s.add(+d.slice(0,4)));
    return [...s].sort((a,b) => b-a);
  }, [entries]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  /* grid */
  const { weeks, monthLabels } = useMemo(
    () => buildGrid(selectedYear, entries),
    [selectedYear, entries]
  );

  /* tooltip */
  const [tip, setTip] = useState('');

  /* stats */
  const { total, streak, moodCounts } = useMemo(() => {
    const vals = Object.values(entries);
    const moodCounts = Object.fromEntries(MOODS.map(m=>[m,0])) as Record<MoodType,number>;
    vals.forEach(e => { if (e.mood) moodCounts[e.mood]++; });
    const sorted = Object.keys(entries).sort().reverse();
    let streak = 0;
    const now = new Date(); now.setHours(0,0,0,0);
    for (const d of sorted) {
      const dt = new Date(d); dt.setHours(0,0,0,0);
      if (Math.round((now.getTime()-dt.getTime())/86400000)===streak) streak++; else break;
    }
    return { total: vals.length, streak, moodCounts };
  }, [entries]);

  const DOW = ['','Mon','','Wed','','Fri',''];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', background:'#F4F6FB', fontFamily:'Helvetica,"Helvetica Neue",Arial,sans-serif' }}>

      <BannerDisplay />

      {/* Avatar + Name */}
      <div style={{ padding:'20px 28px', display:'flex', alignItems:'center', gap:18, flexShrink:0 }}>
        <div style={{ width:64,height:64,background:BRAND.navy,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,color:'#fff',flexShrink:0 }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          {editingName ? (
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input
                autoFocus value={nameDraft} maxLength={40}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') saveName(); if(e.key==='Escape') cancelName(); }}
                style={{ border:`2px solid ${BRAND.navy}`,padding:'4px 8px',fontSize:18,fontWeight:900,fontFamily:'inherit',color:BRAND.navy,outline:'none',letterSpacing:'0.04em',textTransform:'uppercase',width:220 }}
              />
              <button onClick={saveName}   style={iconBtn(BRAND.navy)}><Check size={13}/></button>
              <button onClick={cancelName} style={iconBtn(BRAND.red)}><X size={13}/></button>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ margin:0,fontSize:22,fontWeight:900,color:BRAND.navy,letterSpacing:'0.08em',textTransform:'uppercase' }}>{name}</h1>
              <button onClick={()=>{ setNameDraft(name); setEditingName(true); }} style={iconBtn(BRAND.navy)} title="Edit name">
                <Pencil size={12}/>
              </button>
            </div>
          )}
          <p style={{ margin:'3px 0 0',fontSize:11,fontWeight:600,color:'rgba(2,52,148,0.45)' }}>{userEmail}</p>
        </div>
        <button onClick={onClose} style={{ background:'transparent',border:`2px solid ${BRAND.navy}`,color:BRAND.navy,padding:'6px 14px',fontFamily:'inherit',fontSize:11,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
          <ArrowLeft size={13}/> Journal
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding:'0 28px 18px', display:'flex', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        {[{l:'Total Entries',v:total},{l:'Day Streak',v:streak}].map(({l,v})=>(
          <div key={l} style={{ background:'#fff',border:`2px solid ${BRAND.navy}`,padding:'10px 18px' }}>
            <div style={{ fontSize:26,fontWeight:900,color:BRAND.navy,lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(2,52,148,0.45)',marginTop:3 }}>{l}</div>
          </div>
        ))}
        <div style={{ background:'#fff',border:`2px solid ${BRAND.navy}`,padding:'10px 18px',flex:1,minWidth:180 }}>
          <div style={{ fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(2,52,148,0.45)',marginBottom:6 }}>Mood Breakdown</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {MOODS.filter(m=>moodCounts[m]>0).map(m=>(
              <div key={m} style={{ display:'flex',alignItems:'center',gap:5 }}>
                <div style={{ width:10,height:10,background:MOOD_CONFIG[m].color,flexShrink:0 }}/>
                <span style={{ fontSize:11,fontWeight:700,color:BRAND.navy }}>{moodCounts[m]} {m}</span>
              </div>
            ))}
            {total===0 && <span style={{ fontSize:11,color:'rgba(2,52,148,0.35)',fontWeight:600 }}>No entries yet</span>}
          </div>
        </div>
      </div>

      {/* Year selector */}
      <div style={{ padding:'0 28px 12px', display:'flex', gap:6, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <span style={{ fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(2,52,148,0.45)',marginRight:4 }}>Year</span>
        {availableYears.map(y=>(
          <button key={y} onClick={()=>setSelectedYear(y)} style={{
            background:    y===selectedYear ? BRAND.navy : '#fff',
            color:         y===selectedYear ? '#fff'     : BRAND.navy,
            border:        `2px solid ${BRAND.navy}`,
            padding:       '4px 14px',
            fontFamily:    'inherit',
            fontSize:      13, fontWeight: 800,
            letterSpacing: '0.06em',
            cursor:        'pointer',
          }}>{y}</button>
        ))}
      </div>

      {/* Heatmap grid */}
      <div style={{ padding:'0 28px 32px', flexShrink:0 }}>
        <div style={{ background:'#fff', border:`2px solid ${BRAND.navy}`, padding:'18px 20px', overflowX:'auto' }}>

          {/* Tooltip */}
          <div style={{ fontSize:11,fontWeight:700,color:BRAND.navy,marginBottom:10,height:16,letterSpacing:'0.04em' }}>
            {tip || '\u00A0'}
          </div>

          <div style={{ display:'flex', gap:0 }}>
            {/* Day labels */}
            <div style={{ display:'flex', flexDirection:'column', gap:GAP, paddingTop:20, marginRight:6 }}>
              {DOW.map((lbl,i)=>(
                <div key={i} style={{ height:CELL,lineHeight:`${CELL}px`,fontSize:9,fontWeight:700,color:'rgba(2,52,148,0.40)',textAlign:'right',paddingRight:4,width:22,flexShrink:0 }}>
                  {lbl}
                </div>
              ))}
            </div>

            {/* Grid + month labels */}
            <div>
              {/* Month labels — absolutely positioned */}
              <div style={{ position:'relative', height:18, marginBottom:2 }}>
                {monthLabels.map(({weekIdx,label})=>(
                  <span key={label} style={{ position:'absolute',left:weekIdx*(CELL+GAP),fontSize:10,fontWeight:700,color:'rgba(2,52,148,0.55)',whiteSpace:'nowrap',lineHeight:'18px' }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Week columns */}
              <div style={{ display:'flex', gap:GAP }}>
                {weeks.map((week, wi)=>(
                  <div key={wi} style={{ display:'flex', flexDirection:'column', gap:GAP }}>
                    {week.map(({ dateStr, mood, inYear, future }, di)=>{
                      if (!inYear) {
                        // days outside the selected year — transparent placeholder
                        return <div key={di} style={{ width:CELL, height:CELL, flexShrink:0 }} />;
                      }
                      const bg = future ? '#F4F6FB' : mood ? MOOD_CONFIG[mood].color : '#fff';
                      return (
                        <div
                          key={di}
                          onMouseEnter={()=>setTip(future ? '' : `${dateStr}${mood ? ` — ${mood}` : ' — no entry'}`)}
                          onMouseLeave={()=>setTip('')}
                          style={{
                            width:       CELL,
                            height:      CELL,
                            background:  bg,
                            border:      `1px solid ${BRAND.navy}`,
                            flexShrink:  0,
                            cursor:      future ? 'default' : 'crosshair',
                            opacity:     future ? 0.35 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginTop:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ width:CELL,height:CELL,background:'#fff',border:`1px solid ${BRAND.navy}`,flexShrink:0 }}/>
            <span style={{ fontSize:10,fontWeight:700,color:'rgba(2,52,148,0.45)' }}>No entry</span>
            {MOODS.map(m=>(
              <div key={m} style={{ display:'flex',alignItems:'center',gap:5 }}>
                <div style={{ width:CELL,height:CELL,background:MOOD_CONFIG[m].color,border:`1px solid ${BRAND.navy}`,flexShrink:0 }}/>
                <span style={{ fontSize:10,fontWeight:700,color:BRAND.navy,textTransform:'uppercase',letterSpacing:'0.06em' }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const iconBtn = (color: string): React.CSSProperties => ({
  background:'transparent', border:`1.5px solid ${color}`, color,
  width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center',
  cursor:'pointer', padding:0, flexShrink:0,
});
