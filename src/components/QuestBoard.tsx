import { Plus, Check, Clock, Star, Filter, Sparkles, AlertCircle, CalendarDays, List, Pencil, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Quest, Difficulty, Recurrence, SubTask, FocusSession } from '../store';
import { difficultyConfig as defaultDiffConfig, parseDueDate, dueDateSortKey, todayISO } from '../store';

import { formatMs, titleBadgeMeta, titleBadgePillClass } from '../shop';

import { QuestCalendar } from './QuestCalendar';

interface QuestBoardProps {
  quests: Quest[];
  onComplete: (id: string) => void;
  onAdd: (quest: Omit<Quest, 'id' | 'status'>) => void;

  // Keep existing advanced functionality (no removals)
  onUpdate: (id: string, patch: Partial<Omit<Quest, 'id'>>) => void;
  ownedBadges: string[];
  searchQuery?: string;
  focusQuestId?: string | null;
  onFocusHandled?: () => void;

  // Focus Timer
  focusSession: FocusSession | null;
  focusNowMs: number;
  onStartFocus: (questId: string) => void;
  onStopFocus: (reason?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// DueDateBadge — renders the due date pill with colour coding:
//   🔴 Overdue  →  red text + "Overdue!" label
//   🟡 Today    →  amber text
//   🔵 Soon     →  indigo/blue text
//   ⚪ Future   →  muted text
// ─────────────────────────────────────────────────────────────────────────────
function DueDateBadge({
  dueDate,
  isDark,
  isHinglish,
  lang,
  isCompleted,
}: {
  dueDate: string;
  isDark: boolean;
  isHinglish: boolean;
  lang: 'en' | 'hi';
  isCompleted: boolean;
}) {
  const { label, isOverdue, isDueToday, isDueSoon } = parseDueDate(dueDate);

  if (isCompleted) {
    // Completed quests show a muted date with no urgency styling
    return (
      <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
        <Clock size={10} />
        {label}
      </span>
    );
  }

  if (isOverdue) {
    return (
      <span className="flex items-center gap-1">
        <AlertCircle size={10} className="text-red-500 shrink-0" />
        <span className="text-[10px] font-semibold text-red-500">{label}</span>
      </span>
    );
  }

  if (isDueToday) {
    return (
      <span className={`text-[10px] flex items-center gap-1 font-semibold ${
        isHinglish ? 'text-rose-500' : isDark ? 'text-amber-400' : 'text-amber-600'
      }`}>
        <Clock size={10} />
        {label}
      </span>
    );
  }

  if (isDueSoon) {
    return (
      <span className={`text-[10px] flex items-center gap-1 font-medium ${
        isHinglish ? 'text-violet-500' : isDark ? 'text-indigo-400' : 'text-indigo-500'
      }`}>
        <Clock size={10} />
        {label}
      </span>
    );
  }

  // Default: future or no date
  return (
    <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
      <Clock size={10} />
      {label || t('noDueDate', lang)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestBoard
// ─────────────────────────────────────────────────────────────────────────────
export function QuestBoard({ quests, onComplete, onAdd, onUpdate, ownedBadges, searchQuery = '', focusQuestId, onFocusHandled, focusSession, focusNowMs, onStartFocus, onStopFocus }: QuestBoardProps) {
  const { isDark, isHinglish, lang, theme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('easy');
  const [newCategory, setNewCategory] = useState('Karma');
  const [newDueDate, setNewDueDate] = useState<string>(todayISO()); // real ISO date, defaults to today
  const [showPowerFields, setShowPowerFields] = useState(false);
  const [newRecurring, setNewRecurring] = useState<Recurrence>('none');
  const [newBadge, setNewBadge] = useState<string>('none');
  const [newSubtasks, setNewSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<string>('');

  // Edit modal drafts
  const [editTitle, setEditTitle] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('easy');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editRecurring, setEditRecurring] = useState<Recurrence>('none');
  const [editBadge, setEditBadge] = useState<string>('none');
  const [editSubtasks, setEditSubtasks] = useState<SubTask[]>([]);
  const [editSubtaskText, setEditSubtaskText] = useState('');

  // Scroll/focus from TopNav global search
  useEffect(() => {
    if (!focusQuestId) return;
    const el = document.getElementById(`quest-${focusQuestId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setExpandedId(focusQuestId);
    setTimeout(() => onFocusHandled?.(), 450);
  }, [focusQuestId, onFocusHandled]);

  const diffLabels: Record<Difficulty, string> = {
    easy: t('diffSahaj', lang), medium: t('diffMadhyam', lang),
    hard: t('diffKathin', lang), legendary: t('diffDivya', lang),
  };

  const badgeOptions = useMemo(() => {
    const set = new Set<string>(['none']);
    (ownedBadges || []).forEach((b) => set.add(String(b)));
    return Array.from(set);
  }, [ownedBadges]);

  const editQuest = useMemo(() => {
    if (!editId) return null;
    return quests.find((q) => q.id === editId) ?? null;
  }, [editId, quests]);

  const openEdit = (q: Quest) => {
    setEditId(q.id);
    setEditTitle(q.title || '');
    setEditDifficulty(q.difficulty || 'easy');
    setEditCategory(q.category || '');
    // Normalize legacy seed labels (Today/Tomorrow/etc.) to ISO for the date input.
    setEditDueDate(parseDueDate(q.dueDate).iso || '');
    setEditRecurring((q.recurring || 'none') as Recurrence);
    setEditBadge((q.badge || 'none') as string);
    setEditSubtasks(Array.isArray(q.subtasks) ? q.subtasks.map((s) => ({ ...s })) : []);
    setEditSubtaskText('');
  };

  const closeEdit = () => {
    setEditId(null);
    setEditTitle('');
    setEditCategory('');
    setEditDueDate('');
    setEditRecurring('none');
    setEditBadge('none');
    setEditSubtasks([]);
    setEditSubtaskText('');
  };

  const saveEdit = () => {
    if (!editQuest) return closeEdit();
    const title = editTitle.trim();
    if (!title) return;

    const category = (editCategory || '').trim() || (editQuest.category || 'Karma');
    const cleanSubtasks = (Array.isArray(editSubtasks) ? editSubtasks : [])
      .map((s) => ({ ...s, text: (s.text || '').trim() }))
      .filter((s) => !!s.text);

    onUpdate(editQuest.id, {
      title,
      difficulty: editDifficulty,
      xpReward: defaultDiffConfig[editDifficulty].xp,
      category,
      dueDate: (editDueDate || '').trim(),
      recurring: editRecurring,
      badge: editBadge,
      subtasks: cleanSubtasks,
    });
    closeEdit();
  };

  const addEditSubtask = () => {
    const text = editSubtaskText.trim();
    if (!text) return;
    setEditSubtasks((prev) => [...prev, { id: `edit-${Date.now()}`, text, done: false }]);
    setEditSubtaskText('');
  };

  const updateEditSubtaskText = (id: string, text: string) => {
    setEditSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const toggleEditSubtaskDone = (id: string) => {
    setEditSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const removeEditSubtask = (id: string) => {
    setEditSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Theme-aware class groups ──────────────────────────────────────────────
  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = isHinglish
    ? 'bg-white/60 border-rose-200/30 text-slate-800 placeholder:text-slate-400 focus:ring-rose-300/30'
    : isDark
      ? 'bg-white/[0.03] border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/20'
      : 'bg-slate-50/80 border-slate-200/50 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-300/30';
  const btnGradient = isHinglish
    ? 'bg-gradient-to-r from-rose-500 to-violet-500'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';

  // ── Quest buckets ──────────────────────────────────────────────────────────
  const visibleQuests = useMemo(() => {
    const qSearch = (searchQuery || '').trim().toLowerCase();
    if (!qSearch) return quests;
    return quests.filter((q) =>
      (q.title || '').toLowerCase().includes(qSearch) ||
      (q.category || '').toLowerCase().includes(qSearch) ||
      (q.difficulty || '').toLowerCase().includes(qSearch)
    );
  }, [quests, searchQuery]);


  const activeQuests = visibleQuests.filter(q => q.status === 'active');
  const completedQuests = visibleQuests.filter(q => q.status === 'completed');
  const overdueCount = activeQuests.filter(q => parseDueDate(q.dueDate).isOverdue).length;

  // Active quests: sorted by due date ascending (overdue first → today → tomorrow → future → no date)
  const sortedActiveQuests = [...activeQuests].sort(
    (a, b) => dueDateSortKey(a.dueDate) - dueDateSortKey(b.dueDate)
  );

  // Build the list shown to the user based on the active filter
  // For 'all': show sorted active quests first, then completed quests (preserving original order)
  const filteredQuests =
    filter === 'active'    ? sortedActiveQuests :
    filter === 'completed' ? completedQuests :
    /* all */                [...sortedActiveQuests, ...completedQuests];

  // ── Calendar buckets (by ISO date) ───────────────────────────────────────
  const questsByISO = useMemo(() => {
    const map = new Map<string, Quest[]>();
    for (const q of visibleQuests) {
      const iso = parseDueDate(q.dueDate).iso;
      if (!iso) continue;
      const arr = map.get(iso);
      if (arr) arr.push(q);
      else map.set(iso, [q]);
    }
    // Stable ordering within each day
    for (const [k, arr] of map.entries()) {
      map.set(
        k,
        [...arr].sort((a, b) => {
          if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
          return dueDateSortKey(a.dueDate) - dueDateSortKey(b.dueDate);
        })
      );
    }
    return map;
  }, [visibleQuests]);

  const selectedDayQuests = useMemo(() => {
    const list = questsByISO.get(selectedISO) ?? [];
    if (filter === 'active') return list.filter((q) => q.status === 'active');
    if (filter === 'completed') return list.filter((q) => q.status === 'completed');
    return list;
  }, [questsByISO, selectedISO, filter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleComplete = (id: string) => {
    if (focusSession?.questId === id) {
      onStopFocus('Quest completed. Focus ended.');
    }
    setCompletedAnimation(id);
    setTimeout(() => { onComplete(id); setCompletedAnimation(null); }, 500);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      title: newTitle,
      difficulty: newDifficulty,
      xpReward: defaultDiffConfig[newDifficulty].xp,
      dueDate: newDueDate, // ISO date string
      category: newCategory,
      recurring: newRecurring,
      completedAt: '',
      subtasks: newSubtasks.map((s) => ({ ...s, done: false })),
      badge: newBadge,
    });
    // Reset form fields
    setNewTitle('');
    setNewDueDate(todayISO());
    setNewRecurring('none');
    setNewBadge('none');
    setNewSubtasks([]);
    setNewSubtaskText('');
    setShowPowerFields(false);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setNewTitle('');
    setNewDueDate(todayISO());
    setNewRecurring('none');
    setNewBadge('none');
    setNewSubtasks([]);
    setNewSubtaskText('');
    setShowPowerFields(false);
    setShowForm(false);
  };

  const addNewSubtask = () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setNewSubtasks((prev) => [...prev, { id: `new-${Date.now()}`, text, done: false }]);
    setNewSubtaskText('');
  };

  const removeNewSubtask = (id: string) => {
    setNewSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setSubtaskDraft('');
  };

  const toggleSubtask = (quest: Quest, subId: string) => {
    const list: SubTask[] = Array.isArray(quest.subtasks) ? quest.subtasks : [];
    const next = list.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    onUpdate(quest.id, { subtasks: next });
  };

  const removeSubtask = (quest: Quest, subId: string) => {
    const list: SubTask[] = Array.isArray(quest.subtasks) ? quest.subtasks : [];
    const next = list.filter((s) => s.id !== subId);
    onUpdate(quest.id, { subtasks: next });
  };

  const addSubtask = (quest: Quest) => {
    const text = subtaskDraft.trim();
    if (!text) return;
    const list: SubTask[] = Array.isArray(quest.subtasks) ? quest.subtasks : [];
    const next: SubTask[] = [...list, { id: `${quest.id}-${Date.now()}`, text, done: false }];
    onUpdate(quest.id, { subtasks: next });
    setSubtaskDraft('');
  };

  const updateRecurrence = (quest: Quest, recurring: Recurrence) => {
    onUpdate(quest.id, { recurring });
  };

  const updateBadge = (quest: Quest, badge: string) => {
    onUpdate(quest.id, { badge });
  };

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── Edit Quest Modal ─────────────────────────────────────────────── */}
      {editQuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl shadow-2xl p-5 border ${
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
                <div className={`text-[14px] font-bold ${tp} flex items-center gap-2`}>
                  <Pencil size={16} className={isHinglish ? 'text-rose-500' : 'text-indigo-400'} />
                  Edit Quest
                </div>
                <div className={`text-[12px] mt-1 ${ts}`}>
                  Update title, difficulty, category, due date, recurrence, badge, and checklist.
                </div>
              </div>
              <button
                onClick={closeEdit}
                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
                aria-label="Close"
              >
                <X size={16} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                  placeholder="Quest title"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Difficulty</label>
                  <div className="flex gap-1 flex-wrap">
                    {(Object.keys(defaultDiffConfig) as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setEditDifficulty(d)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          editDifficulty === d
                            ? `${isDark ? defaultDiffConfig[d].darkBg : defaultDiffConfig[d].bg} ${defaultDiffConfig[d].color} ring-1 ring-current/20`
                            : isDark
                              ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {diffLabels[d]} (+{defaultDiffConfig[d].xp})
                      </button>
                    ))}
                  </div>
                  <div className={`text-[11px] mt-1 ${ts}`}>
                    XP on completion: <span className="font-semibold">{defaultDiffConfig[editDifficulty].xp}</span> (before boosts)
                    {editQuest.status === 'completed' && typeof editQuest.earnedXp === 'number' ? (
                      <span className="ml-2">• Earned previously: <span className="font-semibold">{editQuest.earnedXp}</span></span>
                    ) : null}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Category</label>
                  <input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    list="kq-category-list"
                    className={`w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                    placeholder="Karma / Vidya / Yoga…"
                  />
                  <datalist id="kq-category-list">
                    {['Karma', 'Vidya', 'Yoga', 'Sadhana', 'Creative', 'Griha'].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* Due date */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Due date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                      style={{ colorScheme: isDark ? 'dark' : 'light' }}
                    />
                    <button
                      onClick={() => setEditDueDate('')}
                      className={`px-3 py-2 rounded-xl text-[12px] font-semibold ${
                        isDark ? 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Clear due date"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Recurrence */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Recurrence</label>
                  <select
                    value={editRecurring}
                    onChange={(e) => setEditRecurring(e.target.value as Recurrence)}
                    className={`w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                  >
                    <option value="none">{t('recurrenceNone', lang)}</option>
                    <option value="daily">{t('recurrenceDaily', lang)}</option>
                    <option value="weekly">{t('recurrenceWeekly', lang)}</option>
                  </select>
                </div>

                {/* Badge */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Title badge</label>
                  <select
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                  >
                    {badgeOptions.map((b) => {
                      const meta = titleBadgeMeta(b);
                      const label = b === 'none' ? 'None' : `${meta.emoji} ${meta.label}`;
                      return (
                        <option key={b} value={b}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('checklistLabel', lang)}</div>
                <div className="space-y-2">
                  {editSubtasks.map((s) => (
                    <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        checked={!!s.done}
                        onChange={() => toggleEditSubtaskDone(s.id)}
                        className="accent-indigo-500"
                      />
                      <input
                        value={s.text}
                        onChange={(e) => updateEditSubtaskText(s.id, e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                        placeholder="Checklist item"
                      />
                      <button
                        onClick={() => removeEditSubtask(s.id)}
                        className={`text-[12px] px-2 py-2 rounded-xl ${isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <input
                      value={editSubtaskText}
                      onChange={(e) => setEditSubtaskText(e.target.value)}
                      placeholder={t('addSubtaskPlaceholder', lang)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
                      onKeyDown={(e) => e.key === 'Enter' && addEditSubtask()}
                    />
                    <button
                      onClick={addEditSubtask}
                      className={`px-3 py-2 rounded-xl text-[12px] font-semibold text-white ${btnGradient}`}
                    >
                      <Plus size={14} className="inline -mt-[2px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeEdit}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold ${
                  isHinglish
                    ? 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15'
                    : isDark
                      ? 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.08]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editTitle.trim()}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all ${btnGradient} ${
                  !editTitle.trim() ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'
                }`}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
            <span className="text-2xl">{isHinglish ? '💪' : '🏹'}</span>
            {t('questBoardTitle', lang)}
          </h2>
          <p className={`text-[13px] mt-0.5 ${ts}`}>{t('questBoardSub', lang)}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filter toggle */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
            isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-200/40'
          }`}>
            <Filter size={13} className={`ml-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            {(['all', 'active', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  filter === f
                    ? isDark ? 'bg-white/[0.06] text-slate-200 shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                    : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? t('all', lang) : f === 'active' ? t('active', lang) : t('completed', lang)}
              </button>
            ))}
          </div>

          {/* View toggle (List / Calendar) */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
            isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-200/40'
          }`}>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === 'list'
                  ? isDark ? 'bg-white/[0.06] text-slate-200 shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="List view"
            >
              <List size={12} />
              {isHinglish ? 'List' : (lang === 'hi' ? 'सूची' : 'List')}
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === 'calendar'
                  ? isDark ? 'bg-white/[0.06] text-slate-200 shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="Calendar view"
            >
              <CalendarDays size={12} />
              {isHinglish ? 'Calendar' : (lang === 'hi' ? 'कैलेंडर' : 'Calendar')}
            </button>
          </div>

          {/* New Quest button */}
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-medium text-[13px] shadow-md hover:shadow-lg hover:scale-[1.02] transition-all ${btnGradient}`}
          >
            <Plus size={16} /> {t('newQuest', lang)}
          </button>
        </div>
      </div>

      {/* ── Overdue Alert Banner ─────────────────────────────────────────────
           Only shown when there are overdue active quests and the filter
           includes active quests. Draws attention without being intrusive.
      ─────────────────────────────────────────────────────────────────────── */}
      {overdueCount > 0 && filter !== 'completed' && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          isDark
            ? 'bg-red-500/[0.07] border-red-500/20 text-red-400'
            : isHinglish
              ? 'bg-red-50 border-red-200/60 text-red-600'
              : 'bg-red-50 border-red-200/60 text-red-600'
        }`}>
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-[13px] font-medium">
            {overdueCount === 1
              ? isHinglish
                ? `Bhai! 1 kaam late ho gaya — jaldi karo! 😬`
                : `You have 1 overdue quest — let's clear it!`
              : isHinglish
                ? `Bhai! ${overdueCount} kaam late ho gaye — jaldi karo! 😬`
                : `You have ${overdueCount} overdue quest${overdueCount > 1 ? 's' : ''} — tackle them first!`
            }
          </p>
        </div>
      )}

      {/* ── Add Quest Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className={`${card} rounded-2xl p-5 animate-slide-up border ${
          isHinglish ? 'border-rose-300/30' : isDark ? 'border-indigo-500/15' : 'border-indigo-200/40'
        }`}>
          <h3 className={`text-sm font-semibold ${tp} mb-3 flex items-center gap-2`}>
            <Sparkles size={15} className={isHinglish ? 'text-rose-400' : 'text-indigo-400'} />
            {t('createNewQuest', lang)}
          </h3>
          <div className="space-y-3">
            {/* Title */}
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={t('questTitlePlaceholder', lang)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />

            <div className="flex gap-3 flex-wrap">
              {/* Difficulty */}
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('difficulty', lang)}
                </label>
                <div className="flex gap-1">
                  {(Object.keys(defaultDiffConfig) as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setNewDifficulty(d)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        newDifficulty === d
                          ? `${isDark ? defaultDiffConfig[d].darkBg : defaultDiffConfig[d].bg} ${defaultDiffConfig[d].color} ring-1 ring-current/20`
                          : isDark ? 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {diffLabels[d]} (+{defaultDiffConfig[d].xp})
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('category', lang)}
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] border focus:outline-none focus:ring-2 ${inputCls}`}
                >
                  {['Karma', 'Vidya', 'Yoga', 'Sadhana', 'Creative', 'Griha'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* ── Due Date Picker (NEW) ───────────────────────────────────
                   Replaces the hardcoded "Today" string.
                   - Uses <input type="date"> for native browser date picker
                   - allows past dates (retroactive logging)
                   - Shows the CalendarDays icon as a prefix hint
              ──────────────────────────────────────────────────────────────── */}
              <div className="space-y-1">
                <label className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <CalendarDays size={11} />
                  {t('dueDateLabel', lang)}
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] border focus:outline-none focus:ring-2 cursor-pointer ${inputCls}`}
                  style={{
                    // Force the date input text to match the surrounding UI
                    colorScheme: isDark ? 'dark' : 'light',
                  }}
                />
              </div>
            </div>

            {/* ── Power Fields (Recurring / Badge / Checklist) ─────────────── */}
            <div className={`rounded-xl border p-3 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : isHinglish ? 'bg-rose-50/60 border-rose-200/40' : 'bg-slate-50/70 border-slate-200/50'}`}>
              <button
                type="button"
                onClick={() => setShowPowerFields(v => !v)}
                className={`w-full flex items-center justify-between gap-2 text-left text-[12px] font-semibold ${tp}`}
              >
                <span className="flex items-center gap-2">
                  <Star size={14} className={isHinglish ? 'text-rose-400' : 'text-indigo-400'} />
                  {isHinglish ? 'Power Options' : (lang === 'hi' ? 'Power Options' : 'Power Options')}
                </span>
                <span className={`text-[11px] font-medium ${ts}`}>
                  {showPowerFields ? (isHinglish ? 'Hide' : (lang === 'hi' ? 'छुपाएँ' : 'Hide')) : (isHinglish ? 'Show' : (lang === 'hi' ? 'दिखाएँ' : 'Show'))}
                </span>
              </button>

              {showPowerFields && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Recurring */}
                    <div className="space-y-1">
                      <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('recurringLabel', lang)}
                      </label>
                      <select
                        value={newRecurring}
                        onChange={(e) => setNewRecurring(e.target.value as Recurrence)}
                        className={`w-full px-3 py-2 rounded-lg text-[12px] border focus:outline-none focus:ring-2 ${inputCls}`}
                      >
                        <option value="none">{t('recurrenceNone', lang)}</option>
                        <option value="daily">{t('recurrenceDaily', lang)}</option>
                        <option value="weekly">{t('recurrenceWeekly', lang)}</option>
                      </select>
                    </div>

                    {/* Badge */}
                    <div className="space-y-1">
                      <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('badgeLabel', lang)}
                      </label>
                      <select
                        value={newBadge}
                        onChange={(e) => setNewBadge(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg text-[12px] border focus:outline-none focus:ring-2 ${inputCls}`}
                      >
                        {badgeOptions.map((b) => {
                          const meta = titleBadgeMeta(b);
                          return (
                            <option key={b} value={b}>
                              {meta.emoji} {meta.label}
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${titleBadgePillClass(newBadge, theme)}`}>
                          {titleBadgeMeta(newBadge).emoji} {titleBadgeMeta(newBadge).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2">
                    <label className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('checklistLabel', lang)}
                    </label>

                    {newSubtasks.length > 0 && (
                      <div className={`rounded-xl border p-2 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/50 bg-white/60'}`}>
                        <div className="space-y-1.5">
                          {newSubtasks.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2">
                              <div className={`text-[12px] ${tp} flex items-center gap-2`}>
                                <span className={`h-4 w-4 rounded border flex items-center justify-center ${isDark ? 'border-white/10' : 'border-slate-300/60'}`}>
                                  <Check size={12} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                                </span>
                                <span>{s.text}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewSubtask(s.id)}
                                className={`text-[11px] px-2 py-1 rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.04]' : 'text-slate-500 hover:bg-slate-100'}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        placeholder={isHinglish ? 'Add checklist item…' : (lang === 'hi' ? 'Checklist item जोड़ें…' : 'Add checklist item…')}
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-[13px] focus:outline-none focus:ring-2 ${inputCls}`}
                        onKeyDown={(e) => e.key === 'Enter' && addNewSubtask()}
                      />
                      <button
                        type="button"
                        onClick={addNewSubtask}
                        className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold text-white shadow-sm ${btnGradient}`}
                      >
                        {isHinglish ? 'Add' : (lang === 'hi' ? 'जोड़ें' : 'Add')}
                      </button>
                    </div>
                    <p className={`text-[11px] ${ts}`}>
                      {isHinglish
                        ? 'Tip: Daily habit? Set Recurring → Daily + add checklist.'
                        : (lang === 'hi'
                          ? 'Tip: Daily habit के लिए Recurring → Daily चुनें और checklist जोड़ें।'
                          : 'Tip: For a daily habit, set Recurring → Daily and add a checklist.')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelForm}
                className={`px-3.5 py-2 text-[13px] rounded-lg transition-all ${
                  isDark ? 'text-slate-400 hover:bg-white/[0.03]' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t('cancel', lang)}
              </button>
              <button
                onClick={handleAdd}
                className={`px-5 py-2 text-white text-[13px] font-medium rounded-lg shadow-md transition-all ${btnGradient}`}
              >
                {t('createQuest', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────────────────────
           Third stat now shows overdue count (more immediately useful than
           "punya earned" which is already visible in the TopNav bar).
           When there are no overdue quests, falls back to punya earned.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${card} rounded-2xl p-3.5 text-center`}>
          <p className={`text-lg font-bold ${tp}`}>{activeQuests.length}</p>
          <p className={`text-[11px] ${ts}`}>{t('activeQuests', lang)}</p>
        </div>
        <div className={`${card} rounded-2xl p-3.5 text-center`}>
          <p className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {completedQuests.length}
          </p>
          <p className={`text-[11px] ${ts}`}>{t('completed', lang)}</p>
        </div>
        <div className={`${card} rounded-2xl p-3.5 text-center`}>
          {overdueCount > 0 ? (
            <>
              <p className={`text-lg font-bold text-red-500`}>{overdueCount}</p>
              <p className={`text-[11px] ${ts}`}>{t('overdueCount', lang)}</p>
            </>
          ) : (
            <>
              <p className={`text-lg font-bold ${isHinglish ? 'text-rose-400' : isDark ? 'text-violet-400' : 'text-violet-500'}`}>
                {completedQuests.reduce((a, q) => a + q.xpReward, 0)}
              </p>
              <p className={`text-[11px] ${ts}`}>{t('punyaEarned', lang)}</p>
            </>
          )}
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="space-y-3">
          <div className={`${card} rounded-2xl p-4`}>
            <QuestCalendar quests={quests} selectedISO={selectedISO} onSelectISO={setSelectedISO} />
          </div>

          <div className={`${card} rounded-2xl p-4`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className={`text-[12px] font-bold ${tp}`}>
                  {(isHinglish ? 'Due on' : lang === 'hi' ? 'इस दिन देय' : 'Due on')}
                  <span className={`ml-2 font-black ${isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{selectedISO}</span>
                </p>
                <p className={`text-[11px] mt-0.5 ${ts}`}>{selectedDayQuests.length} quest{selectedDayQuests.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setSelectedISO(todayISO())}
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  isHinglish
                    ? 'bg-rose-50/70 border border-rose-200/40 text-rose-600 hover:bg-rose-100/70'
                    : isDark
                      ? 'bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:bg-white/[0.06]'
                      : 'bg-slate-50 border border-slate-200/50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isHinglish ? 'Today' : (lang === 'hi' ? 'आज' : 'Today')}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {selectedDayQuests.length === 0 ? (
                <div className={`py-10 text-center ${ts}`}>
                  <div className="text-4xl opacity-25 mb-2">🗓️</div>
                  <p className={`text-[13px] font-semibold ${tp}`}>{isHinglish ? 'No quests due' : (lang === 'hi' ? 'कोई क्वेस्ट नहीं' : 'No quests due')}</p>
                  <p className="text-[11px] mt-1">{isHinglish ? 'Peaceful day 😌' : (lang === 'hi' ? 'Aaram se 😄' : 'Enjoy the calm!')}</p>
                </div>
              ) : (
                selectedDayQuests.map((q) => {
                  const cfg = defaultDiffConfig[q.difficulty];
                  const done = q.status === 'completed';
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-2xl border flex items-start justify-between gap-3 transition-all ${
                        done
                          ? isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-slate-50/60 border-slate-200/40'
                          : isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-white border-slate-200/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${
                          done
                            ? isDark ? 'text-slate-500 line-through' : 'text-slate-400 line-through'
                            : tp
                        }`}>{q.title}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isDark ? 'bg-white/[0.03] border border-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}>{q.category}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>+{q.xpReward} XP</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {done ? (
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isDark ? 'bg-white/[0.03] text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            <Check size={18} />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleComplete(q.id)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-[1.03] ${
                              isHinglish
                                ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                            }`}
                            aria-label="Complete quest"
                          >
                            <Check size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Quest Cards (List View) ────────────────────────────────────── */
        <div className="space-y-2.5">
          {filteredQuests.map((quest, index) => {
            const config = defaultDiffConfig[quest.difficulty];
            const isCompleting = completedAnimation === quest.id;
            const { isOverdue, isDueToday } = parseDueDate(quest.dueDate);
            const showOverdue = isOverdue && quest.status === 'active';
            const showDueToday = isDueToday && quest.status === 'active';
	            const isExpanded = expandedId === quest.id;
	            const focusOnThis = !!focusSession && focusSession.questId === quest.id;
	            const focusOther = !!focusSession && focusSession.questId !== quest.id;
	            const focusRemaining = focusOnThis ? Math.max(0, focusSession!.endsAt - focusNowMs) : 0;
	            const badgeId = (quest.badge || 'none') as string;
	            const badge = titleBadgeMeta(badgeId);

            return (
              <div
                key={quest.id}
	                id={`quest-${quest.id}`}
                className={[
                  card,
                  'rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
                  // Difficulty left-border (from index.css) — overridden by overdue class if needed
                  showOverdue
                    ? 'quest-card-overdue'           // red left-border, red bg tint
                    : `quest-card-${quest.difficulty}`,
                  quest.status === 'completed' ? 'opacity-50' : '',
                  isCompleting ? 'animate-shake scale-[0.98]' : '',
                ].filter(Boolean).join(' ')}
                style={{ animationDelay: `${index * 40}ms` }}
              >
	                <div className="flex flex-wrap items-center gap-3.5">
                  {/* Completion button */}
                  <button
                    onClick={() => quest.status === 'active' && handleComplete(quest.id)}
                    disabled={quest.status === 'completed'}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      quest.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : showOverdue
                          ? isDark
                            ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:scale-105'
                            : 'bg-red-50 border border-red-200/60 hover:bg-red-100 hover:scale-105'
                          : isDark
                            ? 'bg-white/[0.04] border border-white/[0.08] hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:scale-105'
                            : 'bg-slate-50 border border-slate-200/60 hover:border-indigo-300 hover:bg-indigo-50 hover:scale-105'
                    }`}
                  >
                    {quest.status === 'completed'
                      ? <Check size={16} />
                      : <span className={`text-[10px] ${
                          showOverdue
                            ? 'text-red-400'
                            : isDark ? 'text-slate-600' : 'text-slate-300'
                        }`}>✓</span>
                    }
                  </button>

                  {/* Quest info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium text-[13px] ${
                        quest.status === 'completed'
                          ? 'line-through text-slate-400'
                          : showOverdue
                            ? isDark ? 'text-red-300' : 'text-red-700'
                            : tp
                      }`}>
                        {quest.title}
                      </h4>
                      {quest.difficulty === 'legendary' && <span className="text-xs">👑</span>}
                      {/* Overdue badge */}
                      {showOverdue && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                          isDark
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {t('overdueLabel', lang)}
                        </span>
                      )}
                      {/* Due Today badge */}
                      {showDueToday && !showOverdue && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                          isHinglish
                            ? 'bg-rose-100 text-rose-600'
                            : isDark
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {t('dueTodayLabel', lang)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      {/* Difficulty pill */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isDark ? config.darkBg : config.bg} ${config.color}`}>
                        {diffLabels[quest.difficulty]}
                      </span>

	                      {/* Recurring pill */}
	                      {quest.recurring && quest.recurring !== 'none' && (
	                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
	                          isHinglish ? 'bg-rose-50 text-rose-700' : isDark ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-50 text-slate-700'
	                        }`}>
	                          {quest.recurring === 'daily' ? t('recurrenceDaily', lang) : t('recurrenceWeekly', lang)}
	                        </span>
	                      )}

	                      {/* Badge pill */}
	                      {badgeId !== 'none' && (
	                        <span className={titleBadgePillClass(badgeId, theme)}>
	                          <span>{badge.emoji}</span>
	                          <span>{badge.label}</span>
	                        </span>
	                      )}

                      {/* Due date — uses the DueDateBadge component */}
                      <DueDateBadge
                        dueDate={quest.dueDate}
                        isDark={isDark}
                        isHinglish={isHinglish}
                        lang={lang}
                        isCompleted={quest.status === 'completed'}
                      />

                      {/* Category */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-white/[0.03] text-slate-500' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {quest.category}
                      </span>

	                      {/* Focus status */}
	                      {focusOnThis && quest.status === 'active' && (
	                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
	                          isHinglish ? 'bg-rose-100 text-rose-700' : isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
	                        }`}>
	                          {t('focusInProgress', lang)} • {formatMs(focusRemaining)}
	                        </span>
	                      )}
                    </div>
                  </div>

                  {/* XP badge */}
                  <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0 ${
                    isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                  }`}>
                    <Star size={13} className={
                      isHinglish ? 'text-rose-400 fill-rose-300' :
                      isDark ? 'text-indigo-400 fill-indigo-400' :
                      'text-indigo-500 fill-indigo-400'
                    } />
                    <span className={`text-[13px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      +{quest.xpReward}
                    </span>
                  </div>

	                  {/* Actions: Focus + Details */}
	                  <div className="flex items-center gap-2 shrink-0">
	                    {quest.status === 'active' && (
	                      focusOnThis ? (
	                        <button
	                          onClick={() => onStopFocus()}
	                          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
	                            isHinglish
	                              ? 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15'
	                              : isDark
	                                ? 'bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/20'
	                                : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
	                          }`}
	                        >
	                          {t('focusStop', lang)}
	                        </button>
	                      ) : (
	                        <button
	                          onClick={() => onStartFocus(quest.id)}
	                          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
	                            focusOther
	                              ? (isDark ? 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100')
	                              : (isHinglish ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white' : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white')
	                          }`}
	                        >
	                          {focusOther ? 'Switch Focus' : t('focusStart', lang)}
	                        </button>
	                      )
	                    )}
	                    <button
	                      onClick={() => openEdit(quest)}
	                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
	                        isHinglish ? 'bg-white/60 hover:bg-white/80 border border-rose-200/30'
	                        : isDark ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06]'
	                        : 'bg-white hover:bg-slate-50 border border-slate-200/50'
	                      }`}
	                      aria-label="Edit quest"
	                      title="Edit"
	                    >
	                      <Pencil size={16} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
	                    </button>
	                    <button
	                      onClick={() => toggleExpand(quest.id)}
	                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
	                        isHinglish ? 'bg-white/60 hover:bg-white/80 border border-rose-200/30'
	                        : isDark ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06]'
	                        : 'bg-white hover:bg-slate-50 border border-slate-200/50'
	                      }`}
	                      aria-label="Quest details"
	                      title="Details"
	                    >
	                      <List size={16} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
	                    </button>
	                  </div>
                </div>

	                {/* Expanded details */}
	                {isExpanded && (
	                  <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-200/40'} space-y-3`}> 
	                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	                      <div>
	                        <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('recurringLabel', lang)}</label>
	                        <select
	                          value={(quest.recurring || 'none') as string}
	                          onChange={(e) => updateRecurrence(quest, e.target.value as Recurrence)}
	                          className={`mt-1 w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
	                        >
	                          <option value="none">{t('recurrenceNone', lang)}</option>
	                          <option value="daily">{t('recurrenceDaily', lang)}</option>
	                          <option value="weekly">{t('recurrenceWeekly', lang)}</option>
	                        </select>
	                      </div>
	
	                      <div>
	                        <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('badgeLabel', lang)}</label>
	                        <select
	                          value={(quest.badge || 'none') as string}
	                          onChange={(e) => updateBadge(quest, e.target.value)}
	                          className={`mt-1 w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
	                        >
	                          {badgeOptions.map((b) => {
	                            const meta = titleBadgeMeta(b);
	                            const label = b === 'none' ? 'None' : `${meta.emoji} ${meta.label}`;
	                            return <option key={b} value={b}>{label}</option>;
	                          })}
	                        </select>
	                      </div>
	                    </div>

	                    <div>
	                      <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('checklistLabel', lang)}</div>
	                      <div className="mt-2 space-y-2">
	                        {(Array.isArray(quest.subtasks) ? quest.subtasks : []).map((s) => (
	                          <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
	                            <input
	                              type="checkbox"
	                              checked={!!s.done}
	                              disabled={quest.status === 'completed'}
	                              onChange={() => toggleSubtask(quest, s.id)}
	                              className="accent-indigo-500"
	                            />
	                            <div className={`flex-1 text-[12px] ${quest.status === 'completed' ? 'line-through opacity-70' : ''} ${tp}`}>{s.text}</div>
	                            {quest.status !== 'completed' && (
	                              <button
	                                onClick={() => removeSubtask(quest, s.id)}
	                                className={`text-[12px] px-2 py-1 rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'}`}
	                                title="Remove"
	                              >
	                                ✕
	                              </button>
	                            )}
	                          </div>
	                        ))}

	                        {quest.status !== 'completed' && (
	                          <div className="flex items-center gap-2">
	                            <input
	                              value={subtaskDraft}
	                              onChange={(e) => setSubtaskDraft(e.target.value)}
	                              placeholder={t('addSubtaskPlaceholder', lang)}
	                              className={`flex-1 px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:ring-2 ${inputCls}`}
	                            />
	                            <button
	                              onClick={() => addSubtask(quest)}
	                              className={`px-3 py-2 rounded-xl text-[12px] font-semibold text-white ${btnGradient}`}
	                            >
	                              <Plus size={14} className="inline -mt-[2px]" />
	                            </button>
	                          </div>
	                        )}

	                        {(Array.isArray(quest.subtasks) ? quest.subtasks : []).length === 0 && (
	                          <div className={`text-[12px] ${ts}`}>—</div>
	                        )}
	                      </div>
	                    </div>
	                  </div>
	                )}
              </div>
            );
          })}

          {filteredQuests.length === 0 && (
            <div className="text-center py-14">
              <span className="text-5xl opacity-60">{isHinglish ? '😴' : '🏰'}</span>
              <p className={`font-medium mt-3 ${tp}`}>{t('noQuests', lang)}</p>
              <p className={`text-[13px] mt-1 ${ts}`}>{t('noQuestsSub', lang)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
