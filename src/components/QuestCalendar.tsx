import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { Quest } from '../store';
import { parseDueDate, todayISO } from '../store';

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(anchor: Date, delta: number): Date {
  const d = new Date(anchor);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/**
 * Monthly calendar grid for quests (by due date).
 * - Monday-first week
 * - Click a day to select it
 */
export function QuestCalendar({
  quests,
  selectedISO,
  onSelectISO,
}: {
  quests: Quest[];
  selectedISO: string;
  onSelectISO: (iso: string) => void;
}) {
  const { isDark, isHinglish, lang } = useTheme();

  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = isoToDate(selectedISO || todayISO());
    d.setDate(1);
    return d;
  });

  // Keep month view aligned with selection (if user clicks outside current month via external controls)
  useEffect(() => {
    const s = isoToDate(selectedISO || todayISO());
    const sameMonth = s.getFullYear() === monthCursor.getFullYear() && s.getMonth() === monthCursor.getMonth();
    if (!sameMonth) {
      const next = new Date(s);
      next.setDate(1);
      setMonthCursor(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO]);

  const questsByISO = useMemo(() => {
    const map = new Map<string, Quest[]>();
    for (const q of quests) {
      const d = parseDueDate(q.dueDate).date;
      if (!d) continue;
      const iso = dateToISO(d);
      const arr = map.get(iso);
      if (arr) arr.push(q);
      else map.set(iso, [q]);
    }
    return map;
  }, [quests]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday-first offset
  const offset = (first.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0, ...

  const cells = useMemo(() => {
    const arr: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < 42; i++) {
      const day = i - offset + 1;
      if (day < 1 || day > daysInMonth) {
        arr.push(null);
        continue;
      }
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      arr.push({ iso, day });
    }
    return arr;
  }, [offset, daysInMonth, year, month]);

  const headerText = useMemo(() => {
    // Use locale for month name, but keep consistent across languages
    const d = new Date(year, month, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [year, month]);

  const weekday = (i: number) => {
    const en = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hi = ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'];
    if (lang === 'hi') return hi[i] ?? en[i];
    return en[i];
  };

  const dayCellBase = isHinglish
    ? 'bg-white/60 border-rose-200/30 hover:bg-white/80'
    : isDark
      ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
      : 'bg-white border-slate-200/50 hover:bg-slate-50';

  const today = todayISO();

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthCursor((d) => addMonths(d, -1))}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${dayCellBase}`}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} className={isHinglish ? 'text-rose-500' : isDark ? 'text-slate-300' : 'text-slate-600'} />
          </button>
          <button
            onClick={() => setMonthCursor((d) => addMonths(d, 1))}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${dayCellBase}`}
            aria-label="Next month"
          >
            <ChevronRight size={18} className={isHinglish ? 'text-rose-500' : isDark ? 'text-slate-300' : 'text-slate-600'} />
          </button>
          <div className="ml-1">
            <p className={`text-[13px] font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{headerText}</p>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {isHinglish ? 'Click a day to see quests' : (lang === 'hi' ? 'दिन चुनें' : 'Click a day to see quests')}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const now = new Date();
            now.setDate(1);
            setMonthCursor(now);
            onSelectISO(todayISO());
          }}
          className={`px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all ${dayCellBase}`}
        >
          {isHinglish ? 'Today' : (lang === 'hi' ? 'आज' : 'Today')}
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`text-center text-[10px] font-bold tracking-wide ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
          >
            {weekday(i)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={idx} className="aspect-square" />;
          }
          const isSelected = cell.iso === selectedISO;
          const isToday = cell.iso === today;
          const dayQuests = questsByISO.get(cell.iso) ?? [];
          const activeCount = dayQuests.filter((q) => q.status === 'active').length;
          const doneCount = dayQuests.length - activeCount;

          return (
            <button
              key={cell.iso}
              onClick={() => onSelectISO(cell.iso)}
              className={`aspect-square rounded-2xl border p-2 flex flex-col items-start justify-between transition-all ${dayCellBase} ${
                isSelected
                  ? isHinglish
                    ? 'ring-2 ring-rose-400/60'
                    : isDark
                      ? 'ring-2 ring-indigo-500/40'
                      : 'ring-2 ring-indigo-400/40'
                  : ''
              } ${
                isToday
                  ? isHinglish
                    ? 'outline outline-1 outline-rose-300/60'
                    : isDark
                      ? 'outline outline-1 outline-white/[0.14]'
                      : 'outline outline-1 outline-slate-200'
                  : ''
              }`}
            >
              <div className="w-full flex items-start justify-between gap-2">
                <span className={`text-[12px] font-bold ${isToday ? (isHinglish ? 'text-rose-600' : isDark ? 'text-slate-100' : 'text-slate-900') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{cell.day}</span>
                {dayQuests.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isHinglish
                        ? 'bg-rose-500 text-white'
                        : isDark
                          ? 'bg-indigo-500/30 text-indigo-200'
                          : 'bg-indigo-50 text-indigo-700'
                    }`}
                    aria-label={`${dayQuests.length} quests`}
                  >
                    {dayQuests.length}
                  </span>
                )}
              </div>

              {/* Dots */}
              <div className="w-full flex items-center gap-1">
                {activeCount > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isHinglish ? 'bg-rose-500' : isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
                )}
                {doneCount > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-emerald-400/70' : 'bg-emerald-500/70'}`} />
                )}
                {dayQuests.length === 0 && <span className="h-1.5 w-1.5 rounded-full opacity-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
