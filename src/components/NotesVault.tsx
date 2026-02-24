import { Plus, Search, X, Tag, Paperclip, Upload, ExternalLink, Trash2, Pencil, Save, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import { useSupabaseAttachments } from '../hooks/useSupabaseAttachments';
import type { Note, NoteRevision } from '../store';
import { noteColors } from '../store';
import { formatRelativeTime } from '../notifications';

interface NotesVaultProps {
  notes: Note[];
  onAdd: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'color' | 'emoji'>>) => void;

  /** Optional global search query from TopNav. */
  externalSearchQuery?: string;
  /** If provided, scroll to and open the note preview. */
  focusNoteId?: string | null;
  /** Called after focus has been applied so parent can clear it. */
  onFocusHandled?: () => void;
}

const emojis = ['📜', '💡', '⚛️', '🎯', '📋', '📚', '🧘', '🧪', '🎨', '🕉️', '🪷', '✨'];

export function NotesVault({
  notes,
  onAdd,
  onDelete,
  onUpdate,
  externalSearchQuery = '',
  focusNoteId,
  onFocusHandled,
}: NotesVaultProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editColor, setEditColor] = useState(noteColors[0]);
  const [editEmoji, setEditEmoji] = useState('📜');

  const previewNoteId = previewNote?.id ?? null;
  const attachments = useSupabaseAttachments('note', previewNoteId);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newColor, setNewColor] = useState(noteColors[0]);
  const [newEmoji, setNewEmoji] = useState('📜');

  const [sizePopup, setSizePopup] = useState<{ title: string; message: string } | null>(null);
  const MAX_ATTACHMENT_BYTES = 1 * 1024 * 1024; // 1MB

  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const tm = isHinglish ? 'text-slate-400' : isDark ? 'text-slate-600' : 'text-slate-400';
  const inputCls = isHinglish
    ? 'bg-white/60 border-rose-200/30 text-slate-800 placeholder:text-slate-400 focus:ring-rose-300/30'
    : isDark
      ? 'bg-white/[0.03] border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/20'
      : 'bg-slate-50/80 border-slate-200/50 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-300/30';

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const prettyRelative = (v: string) => {
    const ms = Date.parse(v);
    if (Number.isNaN(ms)) return v; // legacy "2 hours ago" strings
    return formatRelativeTime(new Date(ms).toISOString());
  };

  const noteMetaLine = (n: Note) => {
    const created = prettyRelative(n.createdAt);
    if (n.updatedAt) return `${isHinglish ? 'Banaaya' : 'Created'} ${created} • ${isHinglish ? 'Edit kiya' : 'Edited'} ${prettyRelative(n.updatedAt)}`;
    return `${isHinglish ? 'Banaaya' : 'Created'} ${created}`;
  };

  // Sync with global search bar.
  useEffect(() => {
    if (externalSearchQuery.trim().length === 0) return;
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const filteredNotes = useMemo(
    () =>
      notes.filter((n) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !searchQuery ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((tag) => tag.toLowerCase().includes(q));
        const matchTag = !selectedTag || n.tags.includes(selectedTag);
        return matchSearch && matchTag;
      }),
    [notes, searchQuery, selectedTag]
  );

  // Focus/highlight from global search.
  useEffect(() => {
    if (!focusNoteId) return;
    const note = notes.find((n) => n.id === focusNoteId);
    const el = document.getElementById(`note-${focusNoteId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (note) setPreviewNote(note);
    setTimeout(() => onFocusHandled?.(), 450);
  }, [focusNoteId, notes, onFocusHandled]);

  // Keep previewNote in sync when notes update.
  useEffect(() => {
    if (!previewNote) return;
    const fresh = notes.find((n) => n.id === previewNote.id);
    if (fresh) setPreviewNote(fresh);
  }, [notes, previewNote]);

  // Reset edit state when opening a note
  useEffect(() => {
    if (!previewNote) return;
    setEditMode(false);
    setShowHistory(false);
    setEditTitle(previewNote.title);
    setEditContent(previewNote.content);
    setEditTags(previewNote.tags.join(', '));
    setEditColor(previewNote.color);
    setEditEmoji(previewNote.emoji);
  }, [previewNote?.id]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      title: newTitle,
      content: newContent,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      color: newColor,
      emoji: newEmoji,
    });
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setShowForm(false);
  };

  const startEdit = () => {
    if (!previewNote) return;
    setEditMode(true);
    setShowHistory(false);
    setEditTitle(previewNote.title);
    setEditContent(previewNote.content);
    setEditTags(previewNote.tags.join(', '));
    setEditColor(previewNote.color);
    setEditEmoji(previewNote.emoji);
  };

  const cancelEdit = () => {
    if (!previewNote) return;
    setEditMode(false);
    setEditTitle(previewNote.title);
    setEditContent(previewNote.content);
    setEditTags(previewNote.tags.join(', '));
    setEditColor(previewNote.color);
    setEditEmoji(previewNote.emoji);
  };

  const saveEdit = () => {
    if (!previewNote) return;
    const title = editTitle.trim();
    if (!title) return;

    const tags = editTags
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    onUpdate(previewNote.id, {
      title,
      content: editContent,
      tags,
      color: editColor,
      emoji: editEmoji,
    });

    setEditMode(false);
  };

  const restoreRevision = (rev: NoteRevision) => {
    if (!previewNote) return;
    onUpdate(previewNote.id, {
      title: rev.title,
      content: rev.content,
      tags: rev.tags,
      color: rev.color,
      emoji: rev.emoji,
    });
  };

  const btnGradient = isHinglish
    ? 'bg-gradient-to-r from-rose-500 to-violet-500'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';

  return (
    <div className="space-y-5 animate-slide-up">
      {sizePopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSizePopup(null)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-5 border ${
              isHinglish
                ? 'bg-white/90 border-rose-200/40'
                : isDark
                  ? 'bg-[#16162A] border-white/[0.08]'
                  : 'bg-white border-slate-200/60'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-[14px] font-bold ${tp}`}>{sizePopup.title}</div>
                <div className={`text-[12px] mt-1 ${ts}`}>{sizePopup.message}</div>
              </div>
              <button
                onClick={() => setSizePopup(null)}
                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
                aria-label="Close"
              >
                <X size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSizePopup(null)}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold ${
                  isHinglish
                    ? 'bg-rose-500/10 text-rose-700'
                    : isDark
                      ? 'bg-white/[0.06] text-slate-200'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
            <span className="text-2xl">{isHinglish ? '📚' : '📜'}</span> {t('notesTitle', lang)}
          </h2>
          <p className={`text-[13px] mt-0.5 ${ts}`}>{t('notesSub', lang)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-medium text-[13px] shadow-md hover:shadow-lg hover:scale-[1.02] transition-all ${btnGradient}`}
        >
          <Plus size={16} /> {t('newScroll', lang)}
        </button>
      </div>

      {/* Search + Tags */}
      <div className="space-y-2.5">
        <div className="relative group">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchNotes', lang)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <Tag size={13} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              !selectedTag
                ? isHinglish
                  ? 'bg-rose-500/10 text-rose-600'
                  : isDark
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-600'
                : isDark
                  ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t('all', lang)}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTag === tag
                  ? isHinglish
                    ? 'bg-rose-500/10 text-rose-600'
                    : isDark
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-600'
                  : isDark
                    ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* New Note Form */}
      {showForm && (
        <div
          className={`${card} rounded-2xl p-5 animate-slide-up border ${
            isHinglish ? 'border-rose-300/30' : isDark ? 'border-indigo-500/15' : 'border-indigo-200/40'
          }`}
        >
          <h3 className={`text-sm font-semibold ${tp} mb-3`}>{t('inscribeScroll', lang)}</h3>
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('scrollIcon', lang)}</label>
                <div className="flex gap-0.5 flex-wrap max-w-xs">
                  {emojis.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${
                        newEmoji === e
                          ? isDark
                            ? 'bg-indigo-500/15 ring-1 ring-indigo-400 scale-110'
                            : 'bg-indigo-50 ring-1 ring-indigo-300 scale-110'
                          : isDark
                            ? 'hover:bg-white/[0.04]'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('scrollColor', lang)}</label>
                <div className="flex gap-1 flex-wrap">
                  {noteColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-md transition-all ${newColor === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'} ${
                        isDark ? 'ring-indigo-400 ring-offset-[#16162A]' : 'ring-indigo-400 ring-offset-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('scrollTitle', lang)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
              autoFocus
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t('scrollContent', lang)}
              rows={3}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 resize-none ${inputCls}`}
            />
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder={t('scrollTags', lang)}
              className={`w-full px-3.5 py-2 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className={`px-3.5 py-2 text-[13px] rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.03]' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t('cancel', lang)}
              </button>
              <button onClick={handleAdd} className={`px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md ${btnGradient}`}>
                {t('createScroll', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNotes.map((note, index) => {
          const isFocused = focusNoteId === note.id;
          return (
            <div
              key={note.id}
              id={`note-${note.id}`}
              onClick={() => setPreviewNote(note)}
              className={`${card} rounded-2xl p-4 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 relative overflow-hidden ${
                isFocused
                  ? isHinglish
                    ? 'ring-2 ring-rose-400/40'
                    : isDark
                      ? 'ring-2 ring-indigo-400/30'
                      : 'ring-2 ring-indigo-400/30'
                  : ''
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: note.color }} />
              <div className="flex items-start gap-2.5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${note.color}0D` }}
                >
                  {note.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`font-semibold text-[13px] truncate ${tp}`}>{note.title}</h4>
                  <p className={`text-[12px] mt-0.5 line-clamp-3 leading-relaxed ${ts}`}>{note.content}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1 flex-wrap">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: `${note.color}0D`, color: note.color }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className={`text-[10px] ${tm}`}>{prettyRelative(note.updatedAt || note.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-14">
          <span className="text-5xl opacity-60">{isHinglish ? '🤷' : '📚'}</span>
          <p className={`font-medium mt-3 ${tp}`}>{t('noScrolls', lang)}</p>
          <p className={`text-[13px] mt-1 ${ts}`}>{t('noScrollsSub', lang)}</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setPreviewNote(null)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-7 animate-slide-up relative ${
              isDark ? 'bg-[#16162A] border border-white/[0.06]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl" style={{ backgroundColor: previewNote.color }} />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              {!editMode && (
                <button
                  onClick={startEdit}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  title={isHinglish ? 'Edit' : 'Edit'}
                >
                  <Pencil size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                </button>
              )}
              <button
                onClick={() => setPreviewNote(null)}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                title={isHinglish ? 'Close' : 'Close'}
              >
                <X size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${previewNote.color}0D` }}
              >
                {previewNote.emoji}
              </div>
              <div className="min-w-0">
                <h3 className={`text-lg font-bold ${tp} truncate`}>{previewNote.title}</h3>
                <p className={`text-[11px] ${ts}`}>{noteMetaLine(previewNote)}</p>
              </div>
            </div>

            {/* Content */}
            {editMode ? (
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="space-y-1">
                    <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isHinglish ? 'Icon' : 'Icon'}
                    </label>
                    <div className="flex gap-0.5 flex-wrap max-w-xs">
                      {emojis.map((e) => (
                        <button
                          key={e}
                          onClick={() => setEditEmoji(e)}
                          className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${
                            editEmoji === e
                              ? isDark
                                ? 'bg-indigo-500/15 ring-1 ring-indigo-400 scale-110'
                                : 'bg-indigo-50 ring-1 ring-indigo-300 scale-110'
                              : isDark
                                ? 'hover:bg-white/[0.04]'
                                : 'hover:bg-slate-50'
                          }`}
                          type="button"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isHinglish ? 'Color' : 'Color'}
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {noteColors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-7 h-7 rounded-md transition-all ${editColor === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'} ${
                            isDark ? 'ring-indigo-400 ring-offset-[#16162A]' : 'ring-indigo-400 ring-offset-white'
                          }`}
                          style={{ backgroundColor: c }}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('scrollTitle', lang)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                  autoFocus
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={t('scrollContent', lang)}
                  rows={5}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 resize-none ${inputCls}`}
                />
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={t('scrollTags', lang)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className={`px-3.5 py-2 text-[13px] rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.03]' : 'text-slate-500 hover:bg-slate-50'}`}
                    type="button"
                  >
                    {t('cancel', lang)}
                  </button>
                  <button
                    onClick={saveEdit}
                    className={`inline-flex items-center gap-1.5 px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md ${btnGradient}`}
                    type="button"
                  >
                    <Save size={16} /> {isHinglish ? 'Save' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-[13px] leading-relaxed mb-4 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {previewNote.content}
                </p>
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {previewNote.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{ backgroundColor: `${previewNote.color}0D`, color: previewNote.color }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* History */}
                {Array.isArray(previewNote.revisions) && previewNote.revisions.length > 0 && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                        isHinglish
                          ? 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15'
                          : isDark
                            ? 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/60'
                      }`}
                    >
                      <Clock size={14} /> {isHinglish ? 'History' : 'History'}
                      <span className={`text-[11px] ${ts}`}>({previewNote.revisions.length})</span>
                    </button>

                    {showHistory && (
                      <div className="mt-3 space-y-2">
                        {previewNote.revisions.slice(0, 10).map((rev, idx) => (
                          <div
                            key={`${rev.editedAt}-${idx}`}
                            className={`rounded-xl p-3 border ${
                              isHinglish
                                ? 'bg-white/60 border-rose-200/30'
                                : isDark
                                  ? 'bg-white/[0.03] border-white/[0.06]'
                                  : 'bg-slate-50/80 border-slate-200/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={`text-[12px] font-semibold ${tp} truncate`}>{rev.title || '(untitled)'}</div>
                                <div className={`text-[11px] ${ts}`}>{isHinglish ? 'Edited' : 'Edited'} {prettyRelative(rev.editedAt)}</div>
                                <div className={`text-[11px] mt-1 line-clamp-2 ${ts}`}>{rev.content}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => restoreRevision(rev)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                                  isDark ? 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]' : 'bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                                title={isHinglish ? 'Restore' : 'Restore'}
                              >
                                <RotateCcw size={14} /> {isHinglish ? 'Restore' : 'Restore'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {previewNote.revisions.length > 10 && (
                          <div className={`text-[11px] ${ts}`}>
                            {isHinglish ? 'More revisions saved…' : 'More revisions saved…'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Attachments */}
            <div
              className={`rounded-xl p-3 mb-4 ${
                isHinglish
                  ? 'bg-white/60 border border-rose-200/30'
                  : isDark
                    ? 'bg-white/[0.03] border border-white/[0.06]'
                    : 'bg-slate-50/80 border border-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Paperclip size={14} className={isHinglish ? 'text-rose-600' : isDark ? 'text-slate-300' : 'text-slate-700'} />
                  <p className={`text-[12px] font-semibold ${tp}`}>{isHinglish ? 'Attachments' : (t('attachments', lang) ?? 'Attachments')}</p>
                  <span className={`text-[11px] ${ts}`}>({attachments.rows.length})</span>
                </div>

                <label
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                    !attachments.canUse
                      ? isDark
                        ? 'bg-white/[0.03] text-slate-500'
                        : 'bg-slate-100 text-slate-400'
                      : isHinglish
                        ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15'
                        : isDark
                          ? 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Upload size={14} />
                  {attachments.loading ? (isHinglish ? 'Uploading…' : 'Uploading…') : isHinglish ? 'Upload' : 'Upload'}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={!attachments.canUse || attachments.loading}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) {
                        e.currentTarget.value = '';
                        return;
                      }

                      const list = Array.from(files);
                      const tooLarge = list.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
                      const okFiles = list.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);

                      if (tooLarge.length > 0) {
                        const names = tooLarge
                          .map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`)
                          .slice(0, 6)
                          .join(', ');
                        setSizePopup({
                          title: isHinglish ? 'File bada hai' : 'File too large',
                          message: isHinglish
                            ? `1MB se chhota file upload karo. Too large: ${names}${tooLarge.length > 6 ? '…' : ''}`
                            : `Please upload files under 1MB. Too large: ${names}${tooLarge.length > 6 ? '…' : ''}`,
                        });
                      }

                      if (okFiles.length > 0) {
                        await attachments.uploadFiles(okFiles);
                      }

                      // reset so same file can be selected again
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>

              {!attachments.canUse && <p className={`text-[11px] ${ts}`}>{isHinglish ? 'Login karke files attach karo.' : 'Sign in to attach files.'}</p>}

              {attachments.error && <p className="text-[11px] text-red-400 mt-1">{attachments.error}</p>}

              {attachments.rows.length === 0 ? (
                <p className={`text-[11px] ${ts}`}>{isHinglish ? 'No attachments yet.' : 'No attachments yet.'}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {attachments.rows.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${
                        isHinglish ? 'bg-white/60' : isDark ? 'bg-white/[0.03]' : 'bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[12px] font-medium truncate ${tp}`}>{a.file_name}</p>
                        <p className={`text-[10px] ${ts}`}>
                          {attachments.formatBytes(a.size_bytes)} {a.mime_type ? `• ${a.mime_type}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => attachments.openSignedUrl(a)}
                          className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
                          title="Open"
                          type="button"
                        >
                          <ExternalLink size={14} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                        </button>
                        <button
                          onClick={() => attachments.remove(a)}
                          className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className={`text-[10px] mt-2 ${tm}`}>{isHinglish ? 'Tip: 1MB max per file.' : 'Tip: 1MB max per file.'}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className={`text-[11px] ${ts}`}>{editMode ? (isHinglish ? 'Editing…' : 'Editing…') : ''}</div>
              <button
                onClick={() => {
                  onDelete(previewNote.id);
                  setPreviewNote(null);
                }}
                className="px-3.5 py-1.5 text-[12px] text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                type="button"
              >
                {t('deleteScroll', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
