import { Plus, Check, Clock, Star, Filter, Sparkles, AlertCircle, CalendarDays, List } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Quest, Difficulty } from '../store';
import { difficultyConfig as defaultDiffConfig, parseDueDate, dueDateSortKey, todayISO } from '../store';

import { QuestCalendar } from './QuestCalendar';

interface QuestBoardProps {
  quests: Quest[];
  onComplete: (id: string) => void;
  onAdd: (quest: Omit<Quest, 'id' | 'status'>) => void;
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
export function QuestBoard({ quests, onComplete, onAdd }: QuestBoardProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('easy');
  const [newCategory, setNewCategory] = useState('Karma');
  const [newDueDate, setNewDueDate] = useState<string>(todayISO()); // real ISO date, defaults to today
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);

  const diffLabels: Record<Difficulty, string> = {
    easy: t('diffSahaj', lang), medium: t('diffMadhyam', lang),
    hard: t('diffKathin', lang), legendary: t('diffDivya', lang),
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
  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');
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
    for (const q of quests) {
      const d = parseDueDate(q.dueDate).date;
      if (!d) continue;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  }, [quests]);

  const selectedDayQuests = useMemo(() => {
    const list = questsByISO.get(selectedISO) ?? [];
    if (filter === 'active') return list.filter((q) => q.status === 'active');
    if (filter === 'completed') return list.filter((q) => q.status === 'completed');
    return list;
  }, [questsByISO, selectedISO, filter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleComplete = (id: string) => {
    setCompletedAnimation(id);
    setTimeout(() => { onComplete(id); setCompletedAnimation(null); }, 500);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      title: newTitle,
      difficulty: newDifficulty,
      xpReward: defaultDiffConfig[newDifficulty].xp,
      dueDate: newDueDate, // real ISO date string, never the hardcoded "Today" string
      category: newCategory,
    });
    // Reset form fields — default due date back to today
    setNewTitle('');
    setNewDueDate(todayISO());
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setNewTitle('');
    setNewDueDate(todayISO());
    setShowForm(false);
  };

  return (
    <div className="space-y-5 animate-slide-up">

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
                   - min is today so users can't accidentally set dates in the past
                     (they still can if they want, but default prevents it)
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
                  min={todayISO()} // default min = today; does not block past dates if user edits manually
                  className={`px-3 py-1.5 rounded-lg text-[11px] border focus:outline-none focus:ring-2 cursor-pointer ${inputCls}`}
                  style={{
                    // Force the date input text to match the surrounding UI
                    colorScheme: isDark ? 'dark' : 'light',
                  }}
                />
              </div>
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

            return (
              <div
                key={quest.id}
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
                </div>
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
