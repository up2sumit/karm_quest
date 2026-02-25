// src/utils/xp.ts
// Shared XP & level-up calculation (B5 fix — single source of truth).

export type XpLevelResult = {
    xp: number;
    xpToNext: number;
    level: number;
    totalXpEarned: number;
    didLevelUp: boolean;
};

/**
 * Calculates the new XP, level, and xpToNext after earning `earned` XP.
 * Supports multi-level jumps when bonus is large enough.
 */
export function applyXpGain(
    currentXp: number,
    currentXpToNext: number,
    currentLevel: number,
    currentTotalXp: number,
    earned: number,
): XpLevelResult {
    let xp = currentXp + earned;
    const totalXpEarned = currentTotalXp + earned;
    let level = currentLevel;
    let xpToNext = currentXpToNext;
    let didLevelUp = false;

    while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = Math.round(xpToNext * 1.2);
        didLevelUp = true;
    }

    return { xp, xpToNext, level, totalXpEarned, didLevelUp };
}

/**
 * Generates a unique ID suitable for quests, notes, etc.
 * Uses crypto.randomUUID() when available, with a safe fallback.
 */
export function uniqueId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: timestamp + random (extremely low collision probability)
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
}
