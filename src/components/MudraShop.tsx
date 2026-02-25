import { ShoppingBag, Sparkles, Check, Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { UserStats } from '../store';
import {
  shopCatalog,
  type ShopItem,
  type ShopState,
  type AvatarFrameId,
  type SidebarSkinId,
  isBoostActive,
  boostRemainingMs,
  formatMs,
  titleBadgeMetaForTheme,
  titleBadgePillClass,
} from '../shop';

interface MudraShopProps {
  stats: UserStats;
  shop: ShopState;
  onBuy: (itemId: string) => void;
  onEquipFrame: (frame: AvatarFrameId) => void;
  onEquipSkin: (skin: SidebarSkinId) => void;
}

function displayItem(item: ShopItem, isModern: boolean): ShopItem {
  if (!isModern) return item;

  const byId: Record<string, Partial<ShopItem>> = {
    frame_gold: { name: 'Classic ring', description: 'A clean profile ring.', emoji: '⭕' },
    frame_neon: { name: 'Indigo ring', description: 'A crisp ring with a modern edge.', emoji: '🟦' },
    frame_lotus: { name: 'Soft ring', description: 'Warm, subtle, and calm.', emoji: '◯' },
    frame_obsidian: { name: 'Graphite edge', description: 'Sharp and minimal.', emoji: '⬛' },
    frame_royal: { name: 'Crest frame', description: 'A bold frame for your profile.', emoji: '◆' },

    skin_lotus: { name: 'Warm Paper', description: 'Soft neutrals for focused work.', emoji: '📄' },

    badge_karma_yogi: { name: 'Consistent finisher', description: 'For people who close tasks.', emoji: '✅' },
    badge_focus_monk: { name: 'Deep focus', description: 'For distraction-free work.', emoji: '⏱️' },
    badge_bug_slayer: { name: 'Bug fixer', description: 'For clean sprints and quick fixes.', emoji: '🧩' },
    badge_streak_lord: { name: 'Streak builder', description: 'For steady daily momentum.', emoji: '📅' },
    badge_vidya_guru: { name: 'Note keeper', description: 'For crisp notes and context.', emoji: '🗒️' },
  };

  const o = byId[item.id];
  return o ? ({ ...item, ...o } as ShopItem) : item;
}

function ShopItemCard({
  item,
  owned,
  equipped,
  coins,
  onBuy,
  onEquip,
  onUnequip,
  showToggle,
  kindLabel,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  coins: number;
  onBuy: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  showToggle?: boolean;
  kindLabel: string;
}) {
  const { lang } = useTheme();

  const card = 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_10px_30px_rgba(0,0,0,0.08)]';
  const tp = 'text-[var(--kq-text-primary)]';
  const ts = 'text-[var(--kq-text-secondary)]';

  const canBuy = coins >= item.cost;

  const iconBox = 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]';
  const actionBtn = 'bg-[var(--kq-primary)] text-white hover:bg-[var(--kq-primary-light)]';

  const Toggle = ({ checked, disabled, onToggle }: { checked: boolean; disabled: boolean; onToggle: () => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="kq-toggle"
      title={disabled ? 'Buy to unlock' : checked ? 'Equipped' : 'Tap to equip'}
    >
      <span className="kq-toggle-knob" />
    </button>
  );

  return (
    <div className={`${card} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${iconBox}`}>
          {item.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[13px] font-bold ${tp} truncate`}>{item.name}</p>
              <p className={`text-[11px] mt-0.5 ${ts}`}>{item.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-muted)]">
                {kindLabel}
              </span>
              {showToggle && (
                <Toggle
                  checked={equipped}
                  // If item is equipped but there's no "off" behavior (e.g. the default skin),
                  // disable the switch to avoid a confusing no-op click.
                  disabled={!owned || (equipped && !onUnequip)}
                  onToggle={() => {
                    if (!owned) return;
                    if (equipped) onUnequip?.();
                    else onEquip?.();
                  }}
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--kq-bg2)] border border-[var(--kq-border)]"
            >
              <span className="text-sm">🪙</span>
              <span className={`text-[12px] font-bold ${tp}`}>
                {item.cost}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {owned ? (
                equipped ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--kq-primary)]">
                    <Check size={14} /> {t('shopEquipped', lang)}
                  </span>
                ) : (
                  <button onClick={onEquip} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${actionBtn}`}>
                    {t('shopEquip', lang)}
                  </button>
                )
              ) : (
                <button
                  onClick={onBuy}
                  disabled={!canBuy}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                    canBuy
                      ? actionBtn
                      : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-muted)] cursor-not-allowed'
                  }`}
                >
                  {!canBuy && <Lock size={12} />}
                  {t('shopBuy', lang)}
                </button>
              )}
            </div>
          </div>

          {!owned && !canBuy && (
            <p className="mt-2 text-[10px] font-semibold text-[var(--kq-text-muted)]">
              {t('shopNotEnough', lang)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MudraShop({ stats, shop, onBuy, onEquipFrame, onEquipSkin }: MudraShopProps) {
  const { isModern, theme, lang } = useTheme();

  const [now, setNow] = useState(() => Date.now());
  const boostActive = isBoostActive(shop.activeBoost);
  const boostLeft = boostRemainingMs(shop.activeBoost);

  useEffect(() => {
    if (!boostActive) return;
    const tmr = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tmr);
  }, [boostActive]);
  void now;

  const frames = useMemo(() => shopCatalog.filter((i) => i.kind === 'frame').map((i) => displayItem(i, isModern)), [isModern]);
  const skins = useMemo(() => {
    // Always offer a way to revert to the original sidebar look.
    // `default` is owned by default (see defaultShopState) so this acts as a reset.
    const original: ShopItem = {
      id: 'skin_default',
      kind: 'skin',
      name: isModern ? 'Original sidebar' : 'Default (Original)',
      description: isModern ? 'Revert to the base sidebar theme.' : 'Go back to the original sidebar theme.',
      emoji: isModern ? '↩️' : '↩️',
      cost: 0,
      skinId: 'default',
    };

    const list = shopCatalog
      .filter((i) => i.kind === 'skin')
      .map((i) => displayItem(i, isModern));

    return [original, ...list];
  }, [isModern]);
  const boosts = useMemo(() => shopCatalog.filter((i) => i.kind === 'boost').map((i) => displayItem(i, isModern)), [isModern]);
  const badges = useMemo(() => shopCatalog.filter((i) => i.kind === 'badge').map((i) => displayItem(i, isModern)), [isModern]);

  const card = 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_10px_30px_rgba(0,0,0,0.08)]';
  const tp = 'text-[var(--kq-text-primary)]';
  const ts = 'text-[var(--kq-text-secondary)]';
  const iconTone = 'text-[var(--kq-primary)]';

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
            <span className="text-2xl">🛍️</span>
            {t('shopTitle', lang)}
          </h2>
          <p className={`text-[13px] mt-0.5 ${ts}`}>{t('shopSub', lang)}</p>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${card}`}>
          <span className="text-lg">🪙</span>
          <div>
            <p className={`text-[10px] font-semibold ${ts}`}>{t('shopCoins', lang)}</p>
            <p className={`text-[14px] font-black ${tp}`}>{stats.coins}</p>
          </div>
        </div>
      </div>

      {/* Active Boost */}
      {boostActive && (
        <div className={`${card} rounded-2xl p-4 flex items-center justify-between gap-4`} aria-live="polite">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]"
            >
              <Sparkles size={18} />
            </div>
            <div>
              <p className={`text-[13px] font-bold ${tp}`}>
                {t('shopActiveBoost', lang)} · {shop.activeBoost?.multiplier}×
              </p>
              <p className={`text-[11px] ${ts}`}>
                Time left: <span className="font-semibold">{formatMs(boostLeft)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Frames */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className={iconTone} />
            <h3 className={`text-[13px] font-bold ${tp}`}>{isModern ? 'Profile frames' : 'Avatar Frames'}</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {frames.map((item) => {
              const owned = !!item.frameId && shop.ownedFrames.includes(item.frameId);
              const equipped = owned && item.frameId === shop.equippedFrame;
              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={owned}
                  equipped={equipped}
                  coins={stats.coins}
                  onBuy={() => onBuy(item.id)}
                  onEquip={() => item.frameId && onEquipFrame(item.frameId)}
                  showToggle
                  kindLabel={isModern ? 'Frame' : 'Frame'}
                />
              );
            })}
          </div>
        </div>

        {/* Skins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>{isModern ? 'Sidebar styles' : 'Sidebar Themes'}</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {skins.map((item) => {
              const owned = !!item.skinId && shop.ownedSkins.includes(item.skinId);
              const equipped = owned && item.skinId === shop.equippedSkin;
              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={owned}
                  equipped={equipped}
                  coins={stats.coins}
                  onBuy={() => onBuy(item.id)}
                  onEquip={() => item.skinId && onEquipSkin(item.skinId)}
                  // If a purchased theme is equipped, allow toggling OFF to revert to the original.
                  onUnequip={item.skinId && item.skinId !== 'default' ? () => onEquipSkin('default') : undefined}
                  showToggle
                  kindLabel={isModern ? 'Style' : 'Theme'}
                />
              );
            })}
          </div>
        </div>

        {/* Boosts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>XP boosts</h3>
            <span className={`text-[10px] ${ts}`}>Utility</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {boosts.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                owned={false}
                equipped={false}
                coins={stats.coins}
                onBuy={() => onBuy(item.id)}
                kindLabel={isModern ? 'Boost' : 'Boost'}
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🏷️</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>{isModern ? 'Title badges' : 'Quest Title Badges'}</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {badges.map((item) => {
              const owned = !!item.badgeId && shop.ownedBadges.includes(item.badgeId);
              const canBuy = stats.coins >= item.cost;
              const meta = titleBadgeMetaForTheme(item.badgeId || 'none', theme);

              return (
                <div key={item.id} className={`${card} rounded-2xl p-4`}>
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]"
                    >
                      {item.emoji}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[13px] font-bold ${tp}`}>{item.name}</p>
                        {meta.label && <span className={titleBadgePillClass(meta.id, theme)}>{meta.emoji} {meta.label}</span>}
                      </div>

                      <p className={`text-[11px] mt-0.5 ${ts}`}>{item.description}</p>

                      <div className="mt-3 flex items-center justify-between">
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--kq-bg2)] border border-[var(--kq-border)]"
                        >
                          <span className="text-sm">🪙</span>
                          <span className={`text-[12px] font-bold ${tp}`}>{item.cost}</span>
                        </div>

                        {owned ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--kq-primary)]">
                            <Check size={14} /> {t('shopOwned', lang)}
                          </span>
                        ) : (
                          <button
                            onClick={() => onBuy(item.id)}
                            disabled={!canBuy}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                              canBuy
                                ? 'bg-[var(--kq-primary)] text-white hover:bg-[var(--kq-primary-light)]'
                                : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-muted)] cursor-not-allowed'
                            }`}
                          >
                            {!canBuy && <Lock size={12} className="inline-block mr-1" />}
                            {t('shopBuy', lang)}
                          </button>
                        )}
                      </div>

                      {!owned && !canBuy && (
                        <p className="mt-2 text-[10px] font-semibold text-[var(--kq-text-muted)]">
                          {t('shopNotEnough', lang)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
