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
  titleBadgeMeta,
	  titleBadgePillClass,
} from '../shop';

interface MudraShopProps {
  stats: UserStats;
  shop: ShopState;
  onBuy: (itemId: string) => void;
  onEquipFrame: (frame: AvatarFrameId) => void;
  onEquipSkin: (skin: SidebarSkinId) => void;
}

function ShopItemCard({ item, owned, equipped, coins, onBuy, onEquip, kindLabel }: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  coins: number;
  onBuy: () => void;
  onEquip?: () => void;
  kindLabel: string;
}) {
  const { isDark, isHinglish, lang } = useTheme();
  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';

  const canBuy = coins >= item.cost;

  return (
    <div className={`${card} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
          isHinglish ? 'bg-gradient-to-br from-rose-400/15 to-violet-500/15 text-violet-600'
          : isDark ? 'bg-white/[0.05] text-indigo-300'
          : 'bg-indigo-50 text-indigo-600'
        }`}>
	          {item.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[13px] font-bold ${tp} truncate`}>{item.name}</p>
	              <p className={`text-[11px] mt-0.5 ${ts}`}>{item.description}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
              isHinglish ? 'bg-rose-50 text-rose-600'
              : isDark ? 'bg-white/[0.04] text-slate-400'
              : 'bg-slate-50 text-slate-500'
            }`}>{kindLabel}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
              isHinglish ? 'bg-amber-50/60 border border-amber-200/30'
              : isDark ? 'bg-white/[0.03] border border-white/[0.05]'
                      : 'bg-slate-50 border border-slate-200/40'
            }`}>
              <span className="text-sm">🪙</span>
              <span className={`text-[12px] font-bold ${isHinglish ? 'text-amber-700' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.cost}</span>
            </div>

            <div className="flex items-center gap-2">
              {owned ? (
                equipped ? (
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold ${isHinglish ? 'text-rose-600' : isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    <Check size={14} /> {t('shopEquipped', lang)}
                  </span>
                ) : (
                  <button
                    onClick={onEquip}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      isHinglish
                        ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
                        : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                    }`}
                  >
                    {t('shopEquip', lang)}
                  </button>
                )
              ) : (
                <button
                  onClick={onBuy}
                  disabled={!canBuy}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                    canBuy
                      ? isHinglish
                        ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
                        : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                      : isDark
                        ? 'bg-white/[0.03] text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {!canBuy && <Lock size={12} />}
                  {t('shopBuy', lang)}
                </button>
              )}
            </div>
          </div>

          {!owned && !canBuy && (
            <p className={`mt-2 text-[10px] font-semibold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('shopNotEnough', lang)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MudraShop({ stats, shop, onBuy, onEquipFrame, onEquipSkin }: MudraShopProps) {
  const { isDark, isHinglish, lang } = useTheme();

  const [now, setNow] = useState(() => Date.now());
  const boostActive = isBoostActive(shop.activeBoost);
  const boostLeft = boostRemainingMs(shop.activeBoost);

  useEffect(() => {
    if (!boostActive) return;
    const tmr = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tmr);
  }, [boostActive]);
  // `now` is intentionally unused in JSX other than forcing rerender.
  void now;

  const frames = useMemo(() => shopCatalog.filter(i => i.kind === 'frame'), []);
  const skins = useMemo(() => shopCatalog.filter(i => i.kind === 'skin'), []);
  const boosts = useMemo(() => shopCatalog.filter(i => i.kind === 'boost'), []);
  const badges = useMemo(() => shopCatalog.filter(i => i.kind === 'badge'), []);

  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';

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
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
              isHinglish ? 'bg-violet-500/10 text-violet-600' : isDark ? 'bg-white/[0.05] text-indigo-300' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Sparkles size={18} />
            </div>
            <div>
              <p className={`text-[13px] font-bold ${tp}`}>{t('shopActiveBoost', lang)} · {shop.activeBoost?.multiplier}×</p>
              <p className={`text-[11px] ${ts}`}>Time left: <span className="font-semibold">{formatMs(boostLeft)}</span></p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Frames */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-500'} />
            <h3 className={`text-[13px] font-bold ${tp}`}>Avatar Frames</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {frames.map(item => {
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
                  kindLabel="Frame"
                />
              );
            })}
          </div>
        </div>

        {/* Skins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>Sidebar Themes</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {skins.map(item => {
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
                  kindLabel="Theme"
                />
              );
            })}
          </div>
        </div>

        {/* Boosts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>XP Boosts</h3>
            <span className={`text-[10px] ${ts}`}>Utility</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {boosts.map(item => (
              <ShopItemCard
                key={item.id}
                item={item}
                owned={false}
                equipped={false}
                coins={stats.coins}
                onBuy={() => onBuy(item.id)}
                kindLabel="Boost"
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🏷️</span>
            <h3 className={`text-[13px] font-bold ${tp}`}>Quest Title Badges</h3>
            <span className={`text-[10px] ${ts}`}>Cosmetic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {badges.map(item => {
              const owned = !!item.badgeId && shop.ownedBadges.includes(item.badgeId);
              const meta = titleBadgeMeta(item.badgeId || '');
              const canBuy = stats.coins >= item.cost;
              return (
                <div key={item.id} className={`${card} rounded-2xl p-4`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                      isHinglish ? 'bg-violet-500/10 text-violet-600' : isDark ? 'bg-white/[0.05] text-violet-300' : 'bg-violet-50 text-violet-600'
	                    }`}>{item.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[13px] font-bold ${tp}`}>{item.name}</p>
                        {meta.label && (
	                          <span className={titleBadgePillClass(meta.id, (isHinglish ? 'hinglish' : isDark ? 'dark' : 'light'))}>{meta.label}</span>
                        )}
                      </div>
	                      <p className={`text-[11px] mt-0.5 ${ts}`}>{item.description}</p>

                      <div className="mt-3 flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                          isHinglish ? 'bg-amber-50/60 border border-amber-200/30'
                          : isDark ? 'bg-white/[0.03] border border-white/[0.05]'
                                  : 'bg-slate-50 border border-slate-200/40'
                        }`}>
                          <span className="text-sm">🪙</span>
                          <span className={`text-[12px] font-bold ${tp}`}>{item.cost}</span>
                        </div>

                        {owned ? (
                          <span className={`flex items-center gap-1.5 text-[11px] font-bold ${isHinglish ? 'text-rose-600' : isDark ? 'text-violet-300' : 'text-violet-600'}`}>
                            <Check size={14} /> {t('shopOwned', lang)}
                          </span>
                        ) : (
                          <button
                            onClick={() => onBuy(item.id)}
                            disabled={!canBuy}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                              canBuy
                                ? isHinglish
                                  ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
                                  : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                                : isDark
                                  ? 'bg-white/[0.03] text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {!canBuy && <Lock size={12} className="inline-block mr-1" />}
                            {t('shopBuy', lang)}
                          </button>
                        )}
                      </div>

                      {!owned && !canBuy && (
                        <p className={`mt-2 text-[10px] font-semibold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('shopNotEnough', lang)}</p>
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
