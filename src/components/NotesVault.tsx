import { Plus, Search, X, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Note } from '../store';
import { noteColors } from '../store';

interface NotesVaultProps {
  notes: Note[];
  onAdd: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;

  /** Optional global search query from TopNav. */
  externalSearchQuery?: string;
  /** If provided, scroll to and open the note preview. */
  focusNoteId?: string | null;
  /** Called after focus has been applied so parent can clear it. */
  onFocusHandled?: () => void;
}

const emojis = ['📜', '💡', '⚛️', '🎯', '📋', '📚', '🧘', '🧪', '🎨', '🕉️', '🪷', '✨'];

export function NotesVault({ notes, onAdd, onDelete, externalSearchQuery = '', focusNoteId, onFocusHandled }: NotesVaultProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newColor, setNewColor] = useState(noteColors[0]);
  const [newEmoji, setNewEmoji] = useState('📜');

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

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));
  // Sync with global search bar (Bug #3 fix).
  useEffect(() => {
    if (externalSearchQuery.trim().length === 0) return;
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const filteredNotes = useMemo(() => notes.filter(n => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(tag => tag.toLowerCase().includes(q));
    const matchTag = !selectedTag || n.tags.includes(selectedTag);
    return matchSearch && matchTag;
  }), [notes, searchQuery, selectedTag]);

  // Focus/highlight from global search.
  useEffect(() => {
    if (!focusNoteId) return;
    const note = notes.find(n => n.id === focusNoteId);
    const el = document.getElementById(`note-${focusNoteId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (note) setPreviewNote(note);
    setTimeout(() => onFocusHandled?.(), 450);
  }, [focusNoteId, notes, onFocusHandled]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({ title: newTitle, content: newContent, tags: newTags.split(',').map(t => t.trim()).filter(Boolean), color: newColor, emoji: newEmoji });
    setNewTitle(''); setNewContent(''); setNewTags(''); setShowForm(false);
  };

  const btnGradient = isHinglish
    ? 'bg-gradient-to-r from-rose-500 to-violet-500'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
            <span className="text-2xl">{isHinglish ? '📚' : '📜'}</span> {t('notesTitle', lang)}
          </h2>
          <p className={`text-[13px] mt-0.5 ${ts}`}>{t('notesSub', lang)}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-medium text-[13px] shadow-md hover:shadow-lg hover:scale-[1.02] transition-all ${btnGradient}`}
        >
          <Plus size={16} /> {t('newScroll', lang)}
        </button>
      </div>

      {/* Search + Tags */}
      <div className="space-y-2.5">
        <div className="relative group">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('searchNotes', lang)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <Tag size={13} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
          <button onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              !selectedTag
                ? isHinglish ? 'bg-rose-500/10 text-rose-600' : isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                : isDark ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >{t('all', lang)}</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTag === tag
                  ? isHinglish ? 'bg-rose-500/10 text-rose-600' : isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  : isDark ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >{tag}</button>
          ))}
        </div>
      </div>

      {/* New Note Form */}
      {showForm && (
        <div className={`${card} rounded-2xl p-5 animate-slide-up border ${
          isHinglish ? 'border-rose-300/30' : isDark ? 'border-indigo-500/15' : 'border-indigo-200/40'
        }`}>
          <h3 className={`text-sm font-semibold ${tp} mb-3`}>{t('inscribeScroll', lang)}</h3>
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('scrollIcon', lang)}</label>
                <div className="flex gap-0.5 flex-wrap max-w-xs">
                  {emojis.map(e => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${
                        newEmoji === e
                          ? isDark ? 'bg-indigo-500/15 ring-1 ring-indigo-400 scale-110' : 'bg-indigo-50 ring-1 ring-indigo-300 scale-110'
                          : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('scrollColor', lang)}</label>
                <div className="flex gap-1 flex-wrap">
                  {noteColors.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-md transition-all ${newColor === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'} ${
                        isDark ? 'ring-indigo-400 ring-offset-[#16162A]' : 'ring-indigo-400 ring-offset-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder={t('scrollTitle', lang)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`} autoFocus
            />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder={t('scrollContent', lang)} rows={3}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 resize-none ${inputCls}`}
            />
            <input type="text" value={newTags} onChange={e => setNewTags(e.target.value)}
              placeholder={t('scrollTags', lang)}
              className={`w-full px-3.5 py-2 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className={`px-3.5 py-2 text-[13px] rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.03]' : 'text-slate-500 hover:bg-slate-50'}`}>{t('cancel', lang)}</button>
              <button onClick={handleAdd} className={`px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md ${btnGradient}`}>{t('createScroll', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNotes.map((note, index) => {
          const isFocused = focusNoteId === note.id;
          return (
          <div key={note.id} id={`note-${note.id}`} onClick={() => setPreviewNote(note)}
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: `${note.color}0D` }}>
                {note.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-semibold text-[13px] truncate ${tp}`}>{note.title}</h4>
                <p className={`text-[12px] mt-0.5 line-clamp-3 leading-relaxed ${ts}`}>{note.content}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1 flex-wrap">
                {note.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: `${note.color}0D`, color: note.color }}>
                    {tag}
                  </span>
                ))}
              </div>
              <span className={`text-[10px] ${tm}`}>{note.createdAt}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewNote(null)}>
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-7 animate-slide-up relative ${
              isDark ? 'bg-[#16162A] border border-white/[0.06]' : 'bg-white'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl" style={{ backgroundColor: previewNote.color }} />
            <button onClick={() => setPreviewNote(null)} className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
            }`}>
              <X size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${previewNote.color}0D` }}>
                {previewNote.emoji}
              </div>
              <div>
                <h3 className={`text-lg font-bold ${tp}`}>{previewNote.title}</h3>
                <p className={`text-[11px] ${ts}`}>{previewNote.createdAt}</p>
              </div>
            </div>
            <p className={`text-[13px] leading-relaxed mb-4 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{previewNote.content}</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {previewNote.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                  style={{ backgroundColor: `${previewNote.color}0D`, color: previewNote.color }}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => { onDelete(previewNote.id); setPreviewNote(null); }}
                className="px-3.5 py-1.5 text-[12px] text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                {t('deleteScroll', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
