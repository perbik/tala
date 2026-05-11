/**
 * RichTextEditor
 * --------------
 * contentEditable-based rich text editor with formatting toolbar.
 * Uses document.execCommand (deprecated but universally supported in all
 * major browsers for personal/local apps).
 *
 * Features:
 * - Bold / Italic / Underline (keyboard shortcuts work natively)
 * - Font color via preset palette
 * - Photo insertion via Supabase Storage (no base64 in DB)
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { BRAND } from '../constants/moods';
import { supabase } from '../lib/supabase';

const PHOTO_BUCKET = 'journal-photos';

interface RichTextEditorProps {
    initialHtml: string;
    placeholder?: string;
    onChange: (html: string, plainText: string) => void;
    onPhotoAdded?: (url: string) => void;
    /** Used to scope uploads: {userId}/{entryDate}/{ts}.{ext} */
    userId?: string;
    /** Entry date (YYYY-MM-DD) used as storage folder name */
    entryDate?: string;
}

// Small preset palette drawn from the brand/mood colors + common neutrals
const COLOR_PALETTE = [
    '#023494', '#DE0100', '#D7DE00', '#008DDE', '#00DE30',
    '#6F00DE', '#DE6B00', '#990303',
    '#000000', '#444444', '#888888', '#BBBBBB',
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
];

function htmlToPlain(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? '').trim();
}

// ── Toolbar button style — defined BEFORE TBtn so the const is in scope ──────
const toolbarBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1.5px solid #023494`,
    color: '#023494',
    width: 28, height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    padding: 0,
    transition: 'all 0.1s',
};

/** Toolbar button — uses onMouseDown to avoid stealing focus from editor */
function TBtn({
    active, title, onClick, children, style,
}: {
    active?: boolean;
    title: string;
    onClick: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onClick(e); }}
            title={title}
            style={{
                ...toolbarBtnStyle,
                background: active ? BRAND.navy : 'transparent',
                color: active ? '#fff' : BRAND.navy,
                fontWeight: 900, flexShrink: 0,
                ...style,
            }}
        >
            {children}
        </button>
    );
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    initialHtml,
    placeholder = 'Start writing...',
    onChange,
    onPhotoAdded,
    userId,
    entryDate,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialized = useRef(false);

    const [formats, setFormats] = useState({ bold: false, italic: false, underline: false });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeColor, setActiveColor] = useState<string>(BRAND.navy);
    const [uploading, setUploading] = useState(false);

    // Set initial content exactly once — updating innerHTML on every render
    // destroys the cursor position, so we only touch it on mount.
    useEffect(() => {
        if (editorRef.current && !initialized.current) {
            editorRef.current.innerHTML = initialHtml || '';
            initialized.current = true;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshFormats = useCallback(() => {
        setFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
        });
    }, []);

    const execCmd = useCallback((cmd: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value);
        const html = editorRef.current?.innerHTML ?? '';
        onChange(html, htmlToPlain(html));
        refreshFormats();
    }, [onChange, refreshFormats]);

    const handleInput = useCallback(() => {
        const html = editorRef.current?.innerHTML ?? '';
        onChange(html, htmlToPlain(html));
        refreshFormats();
    }, [onChange, refreshFormats]);

    // ── Image upload → Supabase Storage ─────────────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // allow re-selecting the same file

        const ext = file.name.split('.').pop() ?? 'jpg';
        const ts = Date.now();
        const folder = userId && entryDate ? `${userId}/${entryDate}` : `anon/${ts}`;
        const path = `${folder}/${ts}.${ext}`;

        setUploading(true);
        try {
            const { error: upErr } = await supabase.storage
                .from(PHOTO_BUCKET)
                .upload(path, file, { upsert: true });

            if (upErr) throw upErr;

            const { data: urlData } = supabase.storage
                .from(PHOTO_BUCKET)
                .getPublicUrl(path);

            const url = urlData.publicUrl;

            // Insert <img> at cursor using the public URL (no base64 in DB!)
            editorRef.current?.focus();
            document.execCommand(
                'insertHTML', false,
                `<img src="${url}" alt="Journal photo" style="max-width:100%;margin:10px 0;display:block;border:2px solid #023494;" />`
            );

            onPhotoAdded?.(url);
            handleInput();
        } catch (err) {
            console.error('[RichTextEditor] Photo upload failed:', err);
            alert('Photo upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

            {/* ── Formatting Toolbar ─────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 18px', borderBottom: `2px solid ${BRAND.navy}`,
                background: '#EEF2FA', flexShrink: 0, flexWrap: 'wrap',
            }}>

                {/* Bold */}
                <TBtn active={formats.bold} title="Bold (Ctrl+B)" onClick={() => execCmd('bold')}>
                    <span style={{ fontWeight: 900 }}>B</span>
                </TBtn>

                {/* Italic */}
                <TBtn active={formats.italic} title="Italic (Ctrl+I)" onClick={() => execCmd('italic')}>
                    <span style={{ fontStyle: 'italic', fontWeight: 700 }}>I</span>
                </TBtn>

                {/* Underline */}
                <TBtn active={formats.underline} title="Underline (Ctrl+U)" onClick={() => execCmd('underline')}>
                    <span style={{ textDecoration: 'underline', fontWeight: 700 }}>U</span>
                </TBtn>

                {/* Divider */}
                <div style={{ width: 1, height: 20, background: `${BRAND.navy}30`, margin: '0 2px' }} />

                {/* Font Color */}
                <div style={{ position: 'relative' }}>
                    <TBtn
                        title="Text Color"
                        onClick={() => setShowColorPicker(p => !p)}
                        style={{ flexDirection: 'column', gap: 1, paddingTop: 2 }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, color: activeColor !== BRAND.navy ? activeColor : undefined }}>A</span>
                        <div style={{ width: 16, height: 3, background: activeColor, borderRadius: 1 }} />
                    </TBtn>

                    {showColorPicker && (
                        <div
                            style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
                                background: '#fff', border: `2px solid ${BRAND.navy}`,
                                padding: 8, display: 'grid',
                                gridTemplateColumns: 'repeat(8, 22px)', gap: 3,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            }}
                        >
                            {COLOR_PALETTE.map(c => (
                                <button
                                    key={c}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        execCmd('foreColor', c);
                                        setActiveColor(c);
                                        setShowColorPicker(false);
                                    }}
                                    title={c}
                                    style={{
                                        width: 22, height: 22, padding: 0, cursor: 'pointer',
                                        background: c,
                                        border: c === '#FFFFFF' ? `1px solid ${BRAND.navy}` : '1px solid transparent',
                                        outline: c === activeColor ? `2px solid ${BRAND.navy}` : 'none',
                                        outlineOffset: 1,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 20, background: `${BRAND.navy}30`, margin: '0 2px' }} />

                {/* Image upload */}
                <TBtn
                    title={uploading ? 'Uploading…' : 'Insert Photo'}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{ opacity: uploading ? 0.6 : 1, cursor: uploading ? 'wait' : 'pointer' }}
                >
                    {uploading
                        ? <Loader2 size={14} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} />
                        : <ImagePlus size={14} strokeWidth={2.5} />}
                </TBtn>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            {/* ── Content Editable ───────────────────────────── */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyUp={refreshFormats}
                onMouseUp={refreshFormats}
                onClick={() => setShowColorPicker(false)}
                data-placeholder={placeholder}
                style={{
                    flex: 1, padding: '14px 18px',
                    outline: 'none', overflowY: 'auto',
                    fontSize: 15, lineHeight: 1.75,
                    color: BRAND.navy,
                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    minHeight: 0,
                }}
            />
        </div>
    );
};
