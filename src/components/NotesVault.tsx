import {
  Plus,
  Search,
  X,
  Tag,
  Paperclip,
  Upload,
  ExternalLink,
  Trash2,
  Pencil,
  Save,
  Clock,
  RotateCcw,
  Download,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import { useSupabaseAttachments } from '../hooks/useSupabaseAttachments';
import type { Note, NoteRevision, Quest } from '../store';
import { noteColors } from '../store';
import { formatRelativeTime } from '../notifications';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NotesVaultProps {
  notes: Note[];
  quests: Quest[];
  onAdd: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'color' | 'emoji' | 'folder' | 'linkedQuestId'>>) => void;

  /** Optional global search query from TopNav. */
  externalSearchQuery?: string;
  /** If provided, scroll to and open the note preview. */
  focusNoteId?: string | null;
  /** Called after focus has been applied so parent can clear it. */
  onFocusHandled?: () => void;
}

const emojis = ['📜', '💡', '⚛️', '🎯', '📋', '📚', '🧘', '🧪', '🎨', '🕉️', '🪷', '✨'];

type SortMode = 'newest' | 'modified' | 'title' | 'tag';

function safeParseISO(v?: string | null) {
  if (!v) return NaN;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : NaN;
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function noteToMarkdown(n: Note) {
  const tags = n.tags?.length ? `\n\n---\nTags: ${n.tags.join(', ')}` : '';
  const meta = `\nCreated: ${n.createdAt}${n.updatedAt ? `\nUpdated: ${n.updatedAt}` : ''}`;
  return `# ${n.title}\n\n${n.content || ''}${tags}\n${meta}\n`;
}

function noteToText(n: Note) {
  const tags = n.tags?.length ? `\n\nTags: ${n.tags.join(', ')}` : '';
  const folder = n.folder ? `\nFolder: ${n.folder}` : '';
  const meta = `\n\nCreated: ${n.createdAt}${n.updatedAt ? `\nUpdated: ${n.updatedAt}` : ''}`;
  return `${n.title}\n\n${n.content || ''}${tags}${folder}${meta}\n`;
}

/** Full-text search snippet generation */
function generateSearchSnippet(content: string, query: string, maxLength: number = 100): string | null {
  if (!query) return null;
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  if (index === -1) return null;

  const half = Math.floor(maxLength / 2);
  let start = Math.max(0, index - half);
  let end = Math.min(content.length, index + query.length + half);

  // Try to snap to whole words
  if (start > 0) {
    const spaceIndex = content.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < index) start = spaceIndex;
  }
  if (end < content.length) {
    const spaceIndex = content.lastIndexOf(' ', end);
    if (spaceIndex !== -1 && spaceIndex > index + query.length) end = spaceIndex;
  }

  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

/** Markdown component overrides for Tailwind styling */
function MarkdownView({
  content,
  isDark,
  isModern,
}: {
  content: string;
  isDark: boolean;
  isModern: boolean;
}) {
  const codeBg = isModern
    ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-primary)]'
    : isDark
      ? 'bg-white/[0.03] border border-white/[0.06] text-slate-200'
      : 'bg-slate-50 border border-slate-200 text-slate-800';

  const inlineCodeBg = isModern
    ? 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]'
    : isDark
      ? 'bg-white/10 text-slate-200'
      : 'bg-black/5 text-slate-800';

  // Make sure headings, paragraphs, lists, and code blocks map seamlessly to KarmQuest's tailwind styling.
  return (
    <div className="space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, className, ...props }) => <h3 className="text-[18px] font-extrabold mt-4 mb-2" {...props} />,
          h2: ({ node, className, ...props }) => <h4 className="text-[16px] font-bold mt-4 mb-2" {...props} />,
          h3: ({ node, className, ...props }) => <h5 className="text-[14px] font-semibold mt-3 mb-1" {...props} />,
          p: ({ node, className, ...props }) => <p className="text-[13px] leading-relaxed" {...props} />,
          ul: ({ node, className, ...props }) => <ul className="list-disc pl-5 space-y-1 text-[13px] leading-relaxed" {...props} />,
          ol: ({ node, className, ...props }) => <ol className="list-decimal pl-5 space-y-1 text-[13px] leading-relaxed" {...props} />,
          li: ({ node, className, ...props }) => <li {...props} />,
          blockquote: ({ node, className, ...props }) => (
            <blockquote className="border-l-4 border-indigo-400 pl-3 italic opacity-80" {...props} />
          ),
          a: ({ node, className, ...props }) => (
            <a className="text-indigo-400 hover:text-indigo-500 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <div className={`rounded-xl p-3 my-3 overflow-auto text-[12px] leading-relaxed font-mono ${codeBg}`}>
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            ) : (
              <code className={`px-1.5 py-0.5 rounded-md text-[12px] font-mono ${inlineCodeBg}`} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function NotesVault({
  notes,
  quests,
  onAdd,
  onDelete,
  onUpdate,
  externalSearchQuery = '',
  focusNoteId,
  onFocusHandled,
}: NotesVaultProps) {
  const { isDark, isHinglish, isModern, lang } = useTheme();

  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [revPage, setRevPage] = useState(1);
  const REV_PAGE_SIZE = 6;

  const [restoreFrom, setRestoreFrom] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editColor, setEditColor] = useState(noteColors[0]);
  const [editEmoji, setEditEmoji] = useState('📜');
  const [editFolder, setEditFolder] = useState('');
  const [editLinkedQuestId, setEditLinkedQuestId] = useState<string>('');

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const editContentRef = useRef<HTMLTextAreaElement | null>(null);
  const newContentRef = useRef<HTMLTextAreaElement | null>(null);

  const previewNoteId = previewNote?.id ?? null;
  const attachments = useSupabaseAttachments('note', previewNoteId);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newColor, setNewColor] = useState(noteColors[0]);
  const [newEmoji, setNewEmoji] = useState('📜');
  const [newFolder, setNewFolder] = useState('');
  const [newLinkedQuestId, setNewLinkedQuestId] = useState<string>('');

  const [sizePopup, setSizePopup] = useState<{ title: string; message: string } | null>(null);
  const MAX_ATTACHMENT_BYTES = 1 * 1024 * 1024; // 1MB

  // Keep legacy surfaces for input/tooling UI, but make the NOTE GRID cards
  // follow the same premium material system as the Dashboard stat cards.
  const darkLike = isDark || isHinglish;
  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_1px_rgba(0,0,0,0.04)]'
    : darkLike
      ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isModern ? 'text-[var(--kq-text-primary)]' : darkLike ? 'text-slate-200' : 'text-slate-800';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : darkLike ? 'text-slate-400' : 'text-slate-500';
  const tm = isModern ? 'text-[var(--kq-text-muted)]' : darkLike ? 'text-slate-600' : 'text-slate-400';
  const inputCls = isModern
    ? 'bg-[var(--kq-bg2)] border-[var(--kq-border)] text-[var(--kq-text-primary)] placeholder:text-[var(--kq-text-muted)] focus:ring-[var(--kq-primary)]/20'
    : darkLike
      ? 'bg-white/[0.03] border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/20'
      : 'bg-slate-50/80 border-slate-200/50 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-300/30';

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));
  const allFolders = Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))) as string[];

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

  // Close export menu on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!showExportMenu) return;
      const el = exportMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showExportMenu]);

  // Sync with global search bar.
  useEffect(() => {
    if (externalSearchQuery.trim().length === 0) return;
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const base = notes.filter((n) => {
      const matchSearch =
        !searchQuery ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchTag = !selectedTag || n.tags.includes(selectedTag);
      const matchFolder = !selectedFolder || n.folder === selectedFolder;
      return matchSearch && matchTag && matchFolder;
    });

    const byNewest = (a: Note, b: Note) => safeParseISO(b.createdAt) - safeParseISO(a.createdAt);
    const byModified = (a: Note, b: Note) => {
      const am = safeParseISO(a.updatedAt || a.createdAt);
      const bm = safeParseISO(b.updatedAt || b.createdAt);
      return bm - am;
    };
    const byTitle = (a: Note, b: Note) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const byTag = (a: Note, b: Note) => {
      const at = (a.tags?.[0] ?? '').toLowerCase();
      const bt = (b.tags?.[0] ?? '').toLowerCase();
      if (at !== bt) return at.localeCompare(bt);
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    };

    const sorted = [...base];
    switch (sortMode) {
      case 'modified':
        sorted.sort(byModified);
        break;
      case 'title':
        sorted.sort(byTitle);
        break;
      case 'tag':
        sorted.sort(byTag);
        break;
      case 'newest':
      default:
        sorted.sort(byNewest);
        break;
    }
    return sorted;
  }, [notes, searchQuery, selectedTag, selectedFolder, sortMode]);

  // Focus/highlight from global search or new-linked-note signal
  useEffect(() => {
    if (!focusNoteId) return;

    if (focusNoteId.startsWith('new-link-')) {
      const qid = focusNoteId.replace('new-link-', '');
      const q = quests.find(x => x.id === qid);
      setNewTitle(q ? `${q.title} - Notes` : 'New Linked Note');
      setNewLinkedQuestId(qid);
      setNewFolder(q?.category || '');
      setShowForm(true);
      setTimeout(() => onFocusHandled?.(), 450);
      return;
    }

    const note = notes.find((n) => n.id === focusNoteId);
    const el = document.getElementById(`note-${focusNoteId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (note) setPreviewNote(note);
    setTimeout(() => onFocusHandled?.(), 450);
  }, [focusNoteId, notes, onFocusHandled, quests]);

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
    setEditFolder(previewNote.folder || '');
    setEditLinkedQuestId(previewNote.linkedQuestId || '');
    setShowExportMenu(false);
    setRevPage(1);
    setRestoreFrom(null);
  }, [previewNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      folder: newFolder.trim() || undefined,
      linkedQuestId: newLinkedQuestId || undefined,
    });
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setNewFolder('');
    setNewLinkedQuestId('');
    setShowForm(false);
  };

  const startEdit = () => {
    if (!previewNote) return;
    setEditMode(true);
    setShowHistory(false);
    setShowExportMenu(false);
    setRestoreFrom(null);
    setEditTitle(previewNote.title);
    setEditContent(previewNote.content);
    setEditTags(previewNote.tags.join(', '));
    setEditColor(previewNote.color);
    setEditEmoji(previewNote.emoji);
    setEditFolder(previewNote.folder || '');
    setEditLinkedQuestId(previewNote.linkedQuestId || '');
  };

  const cancelEdit = () => {
    if (!previewNote) return;
    setEditMode(false);
    setEditTitle(previewNote.title);
    setEditContent(previewNote.content);
    setEditTags(previewNote.tags.join(', '));
    setEditColor(previewNote.color);
    setEditEmoji(previewNote.emoji);
    setEditFolder(previewNote.folder || '');
    setEditLinkedQuestId(previewNote.linkedQuestId || '');
    setRestoreFrom(null);
  };

  const saveEdit = () => {
    if (!previewNote) return;
    const title = editTitle.trim();
    if (!title) return;

    const tags = editTags
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const dirty =
      title !== previewNote.title ||
      editContent !== previewNote.content ||
      tags.join('|') !== previewNote.tags.join('|') ||
      editColor !== previewNote.color ||
      editEmoji !== previewNote.emoji ||
      (editFolder.trim() || undefined) !== previewNote.folder ||
      (editLinkedQuestId || undefined) !== previewNote.linkedQuestId;

    if (!dirty) {
      setEditMode(false);
      setRestoreFrom(null);
      return;
    }

    onUpdate(previewNote.id, {
      title,
      content: editContent,
      tags,
      color: editColor,
      emoji: editEmoji,
      folder: editFolder.trim() || undefined,
      linkedQuestId: editLinkedQuestId || undefined,
    });

    setEditMode(false);
    setRestoreFrom(null);
  };

  const restoreRevision = (rev: NoteRevision) => {
    if (!previewNote) return;

    const same =
      previewNote.title === rev.title &&
      previewNote.content === rev.content &&
      previewNote.color === rev.color &&
      previewNote.emoji === rev.emoji &&
      previewNote.folder === rev.folder &&
      previewNote.linkedQuestId === rev.linkedQuestId &&
      previewNote.tags.join('|') === (rev.tags || []).join('|');

    if (same) {
      setSizePopup({
        title: 'Nothing to restore',
        message: 'This version is already the current note.',
      });
      return;
    }

    // Load into editor first. This prevents creating duplicate history entries
    // when users explore past versions.
    setEditMode(true);
    setShowHistory(false);
    setShowExportMenu(false);

    setEditTitle(rev.title);
    setEditContent(rev.content);
    setEditTags((rev.tags || []).join(', '));
    setEditColor(rev.color);
    setEditEmoji(rev.emoji);
    setEditFolder(rev.folder || '');
    setEditLinkedQuestId(rev.linkedQuestId || '');

    setRestoreFrom(rev.editedAt);
  };

  const doExport = (format: 'md' | 'txt') => {
    if (!previewNote) return;
    const safeTitle = (previewNote.title || 'note').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
    if (format === 'md') downloadTextFile(`${safeTitle}.md`, noteToMarkdown(previewNote));
    else downloadTextFile(`${safeTitle}.txt`, noteToText(previewNote));
    setShowExportMenu(false);
  };

  const applyMarkdown = (target: 'new' | 'edit', action: 'h1' | 'h2' | 'bold' | 'italic' | 'code' | 'codeblock' | 'bullet') => {
    const textarea = target === 'edit' ? editContentRef.current : newContentRef.current;
    if (!textarea) return;

    const value = target === 'edit' ? editContent : newContent;
    const setValue = target === 'edit' ? setEditContent : setNewContent;

    const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : value.length;
    const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : value.length;
    const selected = value.slice(start, end);

    const update = (next: string, selStart: number, selEnd: number) => {
      setValue(next);
      requestAnimationFrame(() => {
        try {
          textarea.focus();
          textarea.setSelectionRange(selStart, selEnd);
        } catch {
          // ignore
        }
      });
    };

    const wrap = (before: string, after: string, emptyFill = '') => {
      const inner = selected.length ? selected : emptyFill;
      const next = value.slice(0, start) + before + inner + after + value.slice(end);
      const selS = start + before.length;
      const selE = selS + inner.length;
      update(next, selS, selE);
    };

    const prefixLines = (prefix: string) => {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;

      const block = value.slice(lineStart, blockEnd);
      const lines = block.split('\n');
      const prefixed = lines.map((ln) => (ln.startsWith(prefix) ? ln : prefix + ln)).join('\n');
      const next = value.slice(0, lineStart) + prefixed + value.slice(blockEnd);

      const addedPerLine = prefix.length;
      const lineCount = lines.length;
      const selS = start + addedPerLine;
      const selE = end + addedPerLine * lineCount;
      update(next, selS, selE);
    };

    switch (action) {
      case 'h1':
        prefixLines('# ');
        return;
      case 'h2':
        prefixLines('## ');
        return;
      case 'bold':
        wrap('**', '**', 'bold');
        return;
      case 'italic':
        wrap('*', '*', 'italic');
        return;
      case 'code':
        wrap('`', '`', 'code');
        return;
      case 'codeblock': {
        if (!selected.length) {
          const before = '```\n';
          const after = '\n```';
          const next = value.slice(0, start) + before + '\n' + after + value.slice(end);
          const selS = start + before.length;
          const selE = selS;
          update(next, selS, selE);
          return;
        }
        wrap('```\n', '\n```');
        return;
      }
      case 'bullet':
        prefixLines('- ');
        return;
      default:
        return;
    }
  };

  const editTagsArr = editTags
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const canSaveEdit = !!previewNote &&
    editTitle.trim().length > 0 &&
    (
      editTitle.trim() !== previewNote.title ||
      editContent !== previewNote.content ||
      editTagsArr.join('|') !== previewNote.tags.join('|') ||
      editColor !== previewNote.color ||
      editEmoji !== previewNote.emoji
    );

  const revisionsPager = useMemo(() => {
    const revs = Array.isArray(previewNote?.revisions) ? previewNote.revisions : [];
    const totalPages = Math.max(1, Math.ceil(revs.length / REV_PAGE_SIZE));
    const page = Math.min(Math.max(revPage, 1), totalPages);
    const start = (page - 1) * REV_PAGE_SIZE;
    return {
      revs,
      page,
      totalPages,
      items: revs.slice(start, start + REV_PAGE_SIZE),
    };
  }, [previewNote?.revisions, revPage]);

  const revisionMatchesCurrent = (rev: NoteRevision, n: Note) => {
    return (
      n.title === rev.title &&
      n.content === rev.content &&
      n.color === rev.color &&
      n.emoji === rev.emoji &&
      n.tags.join('|') === (rev.tags || []).join('|')
    );
  };
  const btnGradient = isHinglish
    ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';

  const sortLabel = (m: SortMode) => {
    if (isHinglish) {
      if (m === 'newest') return 'Newest';
      if (m === 'modified') return 'Modified';
      if (m === 'title') return 'Title';
      return 'Tag';
    }
    if (m === 'newest') return 'Newest';
    if (m === 'modified') return 'Modified';
    if (m === 'title') return 'Title (A–Z)';
    return 'Tag';
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Size Popup */}
      {sizePopup && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSizePopup(null)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-5 border ${darkLike
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
                type="button"
              >
                <X size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSizePopup(null)}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold ${darkLike
                  ? 'bg-white/[0.06] text-slate-200'
                  : 'bg-slate-100 text-slate-700'
                  }`}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
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
          type="button"
        >
          <Plus size={16} /> {t('newScroll', lang)}
        </button>
      </div>

      {/* Search + Tags + Sort */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          <div className="relative group flex-1">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchNotes', lang)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 transition-all ${inputCls}`}
            />
          </div>

          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${isModern ? 'border-[var(--kq-border)]' : isDark ? 'border-white/[0.06]' : 'border-slate-200/50'}`}>
            <ArrowUpDown size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className={`bg-transparent text-[13px] outline-none ${tp}`}
              aria-label="Sort notes"
            >
              <option value="newest">{sortLabel('newest')}</option>
              <option value="modified">{sortLabel('modified')}</option>
              <option value="title">{sortLabel('title')}</option>
              <option value="tag">{sortLabel('tag')}</option>
            </select>
          </div>

          {allFolders.length > 0 && (
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${isModern ? 'border-[var(--kq-border)]' : isDark ? 'border-white/[0.06]' : 'border-slate-200/50'}`}>
              <FileText size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
                className={`bg-transparent text-[13px] outline-none ${tp}`}
                aria-label="Filter by folder"
              >
                <option value="">All Folders</option>
                {allFolders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <Tag size={13} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${!selectedTag
              ? isHinglish
                ? 'bg-indigo-500/10 text-indigo-600'
                : isDark
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'bg-indigo-50 text-indigo-600'
              : isDark
                ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            type="button"
          >
            {t('all', lang)}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${selectedTag === tag
                ? isHinglish
                  ? 'bg-indigo-500/10 text-indigo-600'
                  : isDark
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-600'
                : isDark
                  ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* New Note Form */}
      {showForm && (
        <div
          className={`${card} rounded-2xl p-5 animate-slide-up border ${darkLike ? 'border-indigo-500/15' : 'border-indigo-200/40'
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
                      className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${newEmoji === e
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
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('scrollColor', lang)}</label>
                <div className="flex gap-1 flex-wrap">
                  {noteColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-md transition-all ${newColor === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'} ${isDark ? 'ring-indigo-400 ring-offset-[#16162A]' : 'ring-indigo-400 ring-offset-white'
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
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('scrollTitle', lang)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
              autoFocus
            />
            <div className={`flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl border ${isModern ? 'border-[var(--kq-border)] bg-[var(--kq-bg2)]' : isDark ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200/50 bg-slate-50/80'}`}>

              <button type="button" onClick={() => applyMarkdown('new', 'h1')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>H1</button>
              <button type="button" onClick={() => applyMarkdown('new', 'h2')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>H2</button>
              <button type="button" onClick={() => applyMarkdown('new', 'bold')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>B</button>
              <button type="button" onClick={() => applyMarkdown('new', 'italic')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold italic ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>I</button>
              <button type="button" onClick={() => applyMarkdown('new', 'code')} className={`px-2 py-1 rounded-lg text-[11px] font-mono ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>{'</>'}</button>
              <button type="button" onClick={() => applyMarkdown('new', 'codeblock')} className={`px-2 py-1 rounded-lg text-[11px] font-mono ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>```</button>
              <button type="button" onClick={() => applyMarkdown('new', 'bullet')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>• List</button>
            </div>
            <textarea
              ref={newContentRef}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Folder (e.g. Work, Ideas)"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
              />
              <select
                value={newLinkedQuestId}
                onChange={(e) => setNewLinkedQuestId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
              >
                <option value="">No Linked Quest</option>
                {quests.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className={`px-3.5 py-2 text-[13px] rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.03]' : 'text-slate-500 hover:bg-slate-50'}`}
                type="button"
              >
                {t('cancel', lang)}
              </button>
              <button onClick={handleAdd} className={`px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md ${btnGradient}`} type="button">
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
              className={`kq-card kq-card-hover rounded-2xl p-4 cursor-pointer group transition-all duration-300 relative overflow-hidden ${isFocused
                ? isHinglish
                  ? 'ring-2 ring-indigo-400/40'
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

                  {note.folder && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-indigo-500 font-medium">
                      <FileText size={10} /> {note.folder}
                    </div>
                  )}

                  {note.linkedQuestId && (() => {
                    const linkedQ = quests.find(q => q.id === note.linkedQuestId);
                    if (!linkedQ) return null;
                    return (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] font-medium opacity-80" style={{ color: note.color }}>
                        <ExternalLink size={10} /> {linkedQ.title}
                      </div>
                    );
                  })()}

                  <p className={`text-[12px] mt-1.5 line-clamp-3 leading-relaxed ${ts}`}>
                    {searchQuery.trim().length > 0
                      ? (generateSearchSnippet(note.content, searchQuery) || note.content)
                      : note.content}
                  </p>
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
      {previewNote && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setPreviewNote(null)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative my-auto ${isDark ? 'bg-[#16162A] border border-white/[0.06]' : 'bg-white'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl" style={{ backgroundColor: previewNote.color }} />

            <div className="absolute top-4 right-4 flex items-center gap-2" ref={exportMenuRef}>
              {!editMode && (
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  title={isHinglish ? 'Export' : 'Export'}
                  type="button"
                >
                  <Download size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                </button>
              )}

              {!editMode && (
                <button
                  onClick={startEdit}
                  className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  title="Edit"
                  type="button"
                >
                  <Pencil size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                </button>
              )}

              <button
                onClick={() => setPreviewNote(null)}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                title="Close"
                type="button"
              >
                <X size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              </button>

              {showExportMenu && !editMode && (
                <div
                  className={`absolute right-0 top-10 w-44 rounded-xl shadow-xl border overflow-hidden ${isDark ? 'bg-[#111124] border-white/[0.08]' : 'bg-white border-slate-200'
                    }`}
                >
                  <button
                    onClick={() => doExport('md')}
                    className={`w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 ${isDark ? 'hover:bg-white/[0.04] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    type="button"
                  >
                    <FileText size={14} /> Export .md
                  </button>
                  <button
                    onClick={() => doExport('txt')}
                    className={`w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 ${isDark ? 'hover:bg-white/[0.04] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    type="button"
                  >
                    <FileText size={14} /> Export .txt
                  </button>
                </div>
              )}
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

                {previewNote.folder && !editMode && (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-indigo-500 font-medium mb-1">
                    <FileText size={12} /> {previewNote.folder}
                  </div>
                )}

                {previewNote.linkedQuestId && !editMode && (() => {
                  const linkedQ = quests.find(q => q.id === previewNote.linkedQuestId);
                  if (!linkedQ) return null;
                  return (
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium opacity-80 mb-1" style={{ color: previewNote.color }}>
                      <ExternalLink size={12} /> Linked to: {linkedQ.title}
                    </div>
                  );
                })()}

                <p className={`text-[11px] ${ts}`}>{noteMetaLine(previewNote)}</p>
              </div>
            </div>

            {/* Content */}
            {editMode ? (
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="space-y-1">
                    <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Icon</label>
                    <div className="flex gap-0.5 flex-wrap max-w-xs">
                      {emojis.map((e) => (
                        <button
                          key={e}
                          onClick={() => setEditEmoji(e)}
                          className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${editEmoji === e
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
                    <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Color</label>
                    <div className="flex gap-1 flex-wrap">
                      {noteColors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-7 h-7 rounded-md transition-all ${editColor === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'} ${isDark ? 'ring-indigo-400 ring-offset-[#16162A]' : 'ring-indigo-400 ring-offset-white'
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
                {restoreFrom && (
                  <div className={`px-3 py-2 rounded-xl text-[11px] ${isModern ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)]' : isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50/80 border border-slate-200/50'} ${ts}`}>
                    Restoring a previous version from <span className={`${tp} font-semibold`}>{prettyRelative(restoreFrom)}</span>. Review and click <span className={`${tp} font-semibold`}>Save</span> to apply.
                  </div>
                )}

                <div className={`flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl border ${isModern ? 'border-[var(--kq-border)] bg-[var(--kq-bg2)]' : isDark ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200/50 bg-slate-50/80'}`}>

                  <button type="button" onClick={() => applyMarkdown('edit', 'h1')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>H1</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'h2')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>H2</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'bold')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>B</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'italic')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold italic ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>I</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'code')} className={`px-2 py-1 rounded-lg text-[11px] font-mono ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>{'</>'}</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'codeblock')} className={`px-2 py-1 rounded-lg text-[11px] font-mono ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>```</button>
                  <button type="button" onClick={() => applyMarkdown('edit', 'bullet')} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white'}`}>• List</button>
                </div>
                <textarea
                  ref={editContentRef}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    placeholder="Folder (e.g. Work, Ideas)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                  />
                  <select
                    value={editLinkedQuestId}
                    onChange={(e) => setEditLinkedQuestId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                  >
                    <option value="">No Linked Quest</option>
                    {quests.map(q => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>

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
                    disabled={!canSaveEdit}
                    className={`inline-flex items-center gap-1.5 px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md ${btnGradient} ${!canSaveEdit ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
                    type="button"
                  >
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={`mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <MarkdownView content={previewNote.content} isDark={isDark} isModern={isModern} />
                </div>

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
                      onClick={() => {
                        setRevPage(1);
                        setShowHistory((v) => !v);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${isHinglish
                        ? 'bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/15'
                        : isDark
                          ? 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/60'
                        }`}
                    >
                      <Clock size={14} /> History
                      <span className={`text-[11px] ${ts}`}>({previewNote.revisions.length})</span>
                    </button>

                    {showHistory && (
                      <>
                        <div className="mt-3 space-y-2 max-h-72 overflow-auto pr-1">
                          {revisionsPager.items.map((rev, idx) => (
                            <div
                              key={`${rev.editedAt}-${idx}`}
                              className={`rounded-xl p-3 border ${isHinglish
                                ? 'bg-white/60 border-indigo-200/30'
                                : isDark
                                  ? 'bg-white/[0.03] border-white/[0.06]'
                                  : 'bg-slate-50/80 border-slate-200/50'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={`text-[12px] font-semibold ${tp} truncate`}>{rev.title || '(untitled)'}</div>
                                  <div className={`text-[11px] ${ts}`}>Edited {prettyRelative(rev.editedAt)}</div>
                                  <div className={`text-[11px] mt-1 line-clamp-2 ${ts}`}>{rev.content}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!revisionMatchesCurrent(rev, previewNote)) restoreRevision(rev);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${isDark ? 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]' : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                  disabled={revisionMatchesCurrent(rev, previewNote)}
                                  title={revisionMatchesCurrent(rev, previewNote) ? "Already current" : "Load this version"}
                                >
                                  <RotateCcw size={14} /> Restore
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {revisionsPager.totalPages > 1 && (
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setRevPage((p) => Math.max(1, p - 1))}
                              disabled={revisionsPager.page <= 1}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${revisionsPager.page <= 1 ? (isDark ? 'opacity-40 cursor-not-allowed bg-white/[0.03]' : 'opacity-40 cursor-not-allowed bg-slate-50') : isDark ? 'bg-white/[0.05] hover:bg-white/[0.08] text-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                            >
                              Prev
                            </button>
                            <div className={`text-[11px] ${ts}`}>Page {revisionsPager.page} / {revisionsPager.totalPages}</div>
                            <button
                              type="button"
                              onClick={() => setRevPage((p) => Math.min(revisionsPager.totalPages, p + 1))}
                              disabled={revisionsPager.page >= revisionsPager.totalPages}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${revisionsPager.page >= revisionsPager.totalPages ? (isDark ? 'opacity-40 cursor-not-allowed bg-white/[0.03]' : 'opacity-40 cursor-not-allowed bg-slate-50') : isDark ? 'bg-white/[0.05] hover:bg-white/[0.08] text-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Attachments */}
            <div
              className={`rounded-xl p-3 mb-4 ${isHinglish
                ? 'bg-white/60 border border-indigo-200/30'
                : isDark
                  ? 'bg-white/[0.03] border border-white/[0.06]'
                  : 'bg-slate-50/80 border border-slate-200/50'
                }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Paperclip size={14} className={isHinglish ? 'text-indigo-600' : isDark ? 'text-slate-300' : 'text-slate-700'} />
                  <p className={`text-[12px] font-semibold ${tp}`}>{isHinglish ? 'Attachments' : (t('attachments', lang) ?? 'Attachments')}</p>
                  <span className={`text-[11px] ${ts}`}>({attachments.rows.length})</span>
                </div>

                <label
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${!attachments.canUse
                    ? isDark
                      ? 'bg-white/[0.03] text-slate-500'
                      : 'bg-slate-100 text-slate-400'
                    : isHinglish
                      ? 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/15'
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
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${darkLike ? 'bg-white/[0.03]' : 'bg-white'
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
        </div>,
        document.body
      )}
    </div>
  );
}
