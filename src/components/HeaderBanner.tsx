/**
 * HeaderBanner — Cover Photo / Banner
 * Like a Twitter/X header or Facebook cover photo.
 * Upload any image; it's compressed and stored in localStorage.
 * Click the camera icon (or anywhere on the banner) to change it.
 */
import React, { useState, useRef } from 'react';
import { Camera, Pencil, Check, X, Trash2 } from 'lucide-react';
import { BRAND } from '../constants/moods';

const STORAGE_KEY = 'moodjournal_banner';
const BANNER_HEIGHT = 100;

interface BannerData {
  imageBase64: string | null;   // compressed JPEG base64
  bgColor:     string;
  text:        string;
  textDark:    boolean;
  showText:    boolean;
}

const DEFAULT: BannerData = {
  imageBase64: null,
  bgColor:     BRAND.navy,
  text:        '',
  textDark:    false,
  showText:    true,
};

const COLOR_OPTIONS = [
  '#023494', '#DE0100', '#D7DE00', '#008DDE',
  '#00DE30', '#6F00DE', '#DE6B00', '#990303',
  '#000000', '#1A1A2E', '#F4F6FB', '#FFFFFF',
];

function load(): BannerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

function persist(data: BannerData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage full (image too large after compression)
    // Save without the image
    console.warn('Banner: localStorage quota exceeded, saving without image.', e);
    const { imageBase64: _, ...rest } = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, imageBase64: null }));
  }
}

/** Compress image to JPEG at max 900px width and 0.72 quality */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export const HeaderBanner: React.FC = () => {
  const [data,    setData]    = useState<BannerData>(load);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<BannerData>(data);
  const [loading, setLoading] = useState(false);

  const fileRef     = useRef<HTMLInputElement>(null);
  const draftImgRef = useRef<HTMLInputElement>(null);

  /* ── Helpers ────────────────────────────────────────────────── */
  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancel    = () => setEditing(false);
  const apply     = () => { setData(draft); persist(draft); setEditing(false); };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'draft' | 'live',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const b64 = await compressImage(file);
      if (target === 'draft') setDraft(d => ({ ...d, imageBase64: b64 }));
      else {
        const next = { ...data, imageBase64: b64 };
        setData(next); persist(next);
      }
    } finally { setLoading(false); }
    e.target.value = '';
  };

  /* ── Banner background ──────────────────────────────────────── */
  const bg = data.imageBase64
    ? `url("${data.imageBase64}") center/cover no-repeat`
    : data.bgColor;

  const overlayTextColor = data.textDark ? BRAND.navy : '#ffffff';

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>

      {/* ═══ Banner Display ═══════════════════════════════════════ */}
      <div
        style={{
          height:     BANNER_HEIGHT,
          background: bg,
          border:     `2px solid ${BRAND.navy}`,
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        {/* Dark scrim for text readability over photos */}
        {data.imageBase64 && data.showText && (
          <div style={{
            position:   'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* User text */}
        {data.showText && (
          <div style={{
            position:   'absolute',
            bottom:     12,
            left:       16,
            right:      48,
          }}>
            <p style={{
              fontFamily:   'Helvetica, "Helvetica Neue", Arial, sans-serif',
              fontSize:     26,
              fontWeight:   900,
              color:        data.imageBase64 ? '#fff' : overlayTextColor,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight:   1.1,
              margin:       0,
              textShadow:   data.imageBase64 ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {data.text || 'My Journal'}
            </p>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div style={{
            position:       'absolute', inset: 0,
            background:     'rgba(255,255,255,0.6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 24, height: 24,
              border: `3px solid ${BRAND.navy}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {/* Quick-upload (camera) icon — top-right corner */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5 }}>
          <button
            onClick={() => fileRef.current?.click()}
            title="Change cover photo"
            style={iconBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.28)')}
          >
            <Camera size={13} strokeWidth={2.5} color="#fff" />
          </button>
          <button
            onClick={startEdit}
            title="Customize banner"
            style={iconBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.28)')}
          >
            <Pencil size={13} strokeWidth={2.5} color="#fff" />
          </button>
        </div>

        {/* Hidden file input for quick photo swap */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFileChange(e, 'live')}
        />
      </div>

      {/* ═══ Edit Popover ═════════════════════════════════════════ */}
      {editing && (
        <div
          className="fade-in"
          style={{
            position:   'absolute',
            top:        'calc(100% + 4px)',
            left:       0,
            right:      0,
            zIndex:     500,
            background: '#fff',
            border:     `2px solid ${BRAND.navy}`,
            padding:    14,
            boxShadow:  '0 6px 24px rgba(0,0,0,0.18)',
          }}
        >

          {/* Cover photo upload */}
          <label style={labelStyle}>Cover Photo</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <button
              onClick={() => draftImgRef.current?.click()}
              style={{
                flex:        1,
                background:  BRAND.navy,
                color:       '#fff',
                border:      'none',
                padding:     '8px 12px',
                fontFamily:  'Helvetica, "Helvetica Neue", Arial, sans-serif',
                fontSize:    11,
                fontWeight:  800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor:      'pointer',
                display:     'flex',
                alignItems:  'center',
                gap:         6,
              }}
            >
              <Camera size={12} /> Upload Photo
            </button>
            {draft.imageBase64 && (
              <button
                onClick={() => setDraft(d => ({ ...d, imageBase64: null }))}
                title="Remove photo"
                style={{
                  background:  'transparent',
                  border:      `2px solid ${BRAND.red}`,
                  color:       BRAND.red,
                  width:       32,
                  height:      32,
                  cursor:      'pointer',
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  flexShrink:  0,
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <input
            ref={draftImgRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFileChange(e, 'draft')}
          />

          {/* Display name */}
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            value={draft.text}
            onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
            maxLength={40}
            placeholder="e.g. Your name or a quote"
            style={inputStyle}
          />

          {/* Background color (shown when no photo) */}
          {!draft.imageBase64 && (
            <>
              <label style={labelStyle}>Background Color (when no photo)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {COLOR_OPTIONS.map(hex => (
                  <button
                    key={hex}
                    onClick={() => setDraft(d => ({ ...d, bgColor: hex }))}
                    style={{
                      width:   26, height: 26, padding: 0,
                      background: hex, cursor: 'pointer',
                      border:  draft.bgColor === hex
                        ? `3px solid ${BRAND.navy}`
                        : hex === '#FFFFFF' || hex === '#F4F6FB'
                        ? `1px solid ${BRAND.navy}`
                        : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Toggle options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <label style={{ ...checkboxLabel }}>
              <input
                type="checkbox"
                checked={draft.showText}
                onChange={e => setDraft(d => ({ ...d, showText: e.target.checked }))}
                style={{ accentColor: BRAND.navy }}
              />
              Show name on banner
            </label>
            {draft.showText && !draft.imageBase64 && (
              <label style={{ ...checkboxLabel }}>
                <input
                  type="checkbox"
                  checked={draft.textDark}
                  onChange={e => setDraft(d => ({ ...d, textDark: e.target.checked }))}
                  style={{ accentColor: BRAND.navy }}
                />
                Dark text (for light backgrounds)
              </label>
            )}
          </div>

          {/* Preview */}
          <label style={labelStyle}>Preview</label>
          <div style={{
            height:     60,
            background: draft.imageBase64 ? `url("${draft.imageBase64}") center/cover no-repeat` : draft.bgColor,
            border:     `2px solid ${BRAND.navy}`,
            position:   'relative',
            overflow:   'hidden',
            marginBottom: 12,
          }}>
            {draft.imageBase64 && draft.showText && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)', pointerEvents: 'none' }} />
            )}
            {draft.showText && (
              <p style={{
                position:     'absolute',
                bottom:       8, left: 10, right: 10,
                fontFamily:   'Helvetica, "Helvetica Neue", Arial, sans-serif',
                fontSize:     14, fontWeight: 900, margin: 0,
                color:        draft.imageBase64 ? '#fff' : (draft.textDark ? BRAND.navy : '#fff'),
                textTransform: 'uppercase',
                textShadow:   draft.imageBase64 ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                overflow:     'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {draft.text || 'My Journal'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={cancel}  style={cancelBtnStyle}><X size={12} /> Cancel</button>
            <button onClick={apply}   style={applyBtnStyle}><Check size={12} /> Apply</button>
          </div>

        </div>
      )}
    </div>
  );
};

/* ── Shared styles ─────────────────────────────────────────────────────────── */
const iconBtnStyle: React.CSSProperties = {
  background:     'rgba(0,0,0,0.28)',
  border:         'none',
  width:          28, height: 28,
  cursor:         'pointer',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  transition:     'background 0.15s',
};

const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      10,
  fontWeight:    800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color:         BRAND.navy,
  marginBottom:  5,
  fontFamily:    'Helvetica, "Helvetica Neue", Arial, sans-serif',
};

const inputStyle: React.CSSProperties = {
  width:        '100%',
  border:       `2px solid ${BRAND.navy}`,
  padding:      '7px 10px',
  fontSize:     14,
  fontWeight:   700,
  fontFamily:   'Helvetica, "Helvetica Neue", Arial, sans-serif',
  color:        BRAND.navy,
  outline:      'none',
  marginBottom: 12,
  boxSizing:    'border-box',
};

const checkboxLabel: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        8,
  fontSize:   11,
  fontWeight: 700,
  color:      BRAND.navy,
  fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
  cursor:     'pointer',
  userSelect: 'none',
};

const cancelBtnStyle: React.CSSProperties = {
  background:    'transparent',
  border:        `2px solid ${BRAND.navy}`,
  color:         BRAND.navy,
  padding:       '6px 14px',
  fontFamily:    'Helvetica, "Helvetica Neue", Arial, sans-serif',
  fontSize:      11, fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor:        'pointer',
  display:       'flex', alignItems: 'center', gap: 5,
};

const applyBtnStyle: React.CSSProperties = {
  background:    BRAND.navy,
  border:        'none',
  color:         '#fff',
  padding:       '6px 14px',
  fontFamily:    'Helvetica, "Helvetica Neue", Arial, sans-serif',
  fontSize:      11, fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor:        'pointer',
  display:       'flex', alignItems: 'center', gap: 5,
};
