export type Lang = 'en' | 'hi';

const translations = {
  // App-level
  appName: { en: 'KarmQuest', hi: 'KarmQuest 🪔' },
  appTagline: { en: 'Level Up Your Karma', hi: 'Apna Karma Level Up Karo!' },

  // Sidebar
  navDashboard: { en: 'Dashboard', hi: 'Ghar 🏠' },
  navQuests: { en: 'Karma Quests', hi: 'Kaam-Dhaam 💪' },
  navNotes: { en: 'Vidya Scrolls', hi: 'Gyaan Ki Potli 🧠' },
  navAchievements: { en: 'Siddhi Hall', hi: 'Trophy Room 🏆' },
  navChallenges: { en: 'Tapasya', hi: 'Daily Hustle 🔥' },
  navShop: { en: 'Mudra Shop', hi: 'Dukaan 🛍️' },
  navSettings: { en: 'Settings', hi: 'Setting-Wetting ⚙️' },

  // TopNav
  searchPlaceholder: { en: 'Search quests, scrolls...', hi: 'Kuch bhi dhoondho yahan...' },
  levelLabel: { en: 'Lvl', hi: 'Level' },
  daysLabel: { en: 'days', hi: 'din' },

  // Dashboard
  welcomeGreeting: { en: 'Namaste', hi: 'Kya haal hai' },
  welcomeTitle: { en: "Ready for Today's Karma? 🪔", hi: "Aaj ka kaam shuru karein? Let's goooo! 🚀" },
  startQuest: { en: 'Start Your Quest 🏹', hi: 'Chalo Shuru Karte Hai! 💥' },
  todaysKarma: { en: "Today's Karma", hi: 'Aaj Ka Score' },
  questsDone: { en: 'quests done', hi: 'kaam ho gaye' },
  totalPunya: { en: 'Total Punya', hi: 'Total XP Bhai' },
  chakraLabel: { en: 'Chakra', hi: 'Level' },
  goldMudras: { en: 'Gold Mudras', hi: 'Paisa Hi Paisa 💰' },
  keepGrinding: { en: 'Keep grinding!', hi: 'Aur kamao bhai!' },
  siddhiLabel: { en: 'Siddhi', hi: 'Trophies' },
  unlocked: { en: 'unlocked', hi: 'mil gayi!' },
  karmaProgress: { en: 'Karma Progress', hi: 'Kitna Kaam Hua?' },
  complete: { en: 'Complete', hi: 'Done hai!' },
  recentScrolls: { en: 'Recent Scrolls', hi: 'Latest Gyaan' },
  viewAll: { en: 'View All', hi: 'Sab Dekho' },
  tapasyaStreak: { en: 'Tapasya Streak', hi: 'Streak Chal Rahi Hai 🔥' },
  daysOfSadhana: { en: 'Days of Sadhana!', hi: 'Din Se Grind On Hai!' },
  jaiHoYoddha: { en: 'Jai Ho, Yoddha! 🙏', hi: 'Kya Baat Hai Bhai! 🤜🤛' },
  daysUntilBonus: { en: 'days until bonus punya!', hi: 'din mein bonus milega!' },
  weeklyAsura: { en: 'Weekly Asura Challenge', hi: 'Hafta Wala Boss Fight' },
  ravanaTitle: { en: 'Ravana of Distractions', hi: 'Distraction Ka Raavan 👹' },
  ravanaDesc: { en: 'Complete 15 quests this week to defeat the Asura!', hi: 'Is hafte 15 kaam karo aur Raavan ko harao!' },
  questsLabel: { en: 'quests', hi: 'kaam' },
  rewardLabel: { en: 'Reward', hi: 'Inam' },

  // Quest Board
  questBoardTitle: { en: 'Karma Quest Board', hi: 'Kaam-Dhaam Board 📋' },
  questBoardSub: { en: 'Accept and conquer your daily quests', hi: 'Aaj ke kaam accept karo aur khatam karo!' },
  newQuest: { en: 'New Quest', hi: 'Naya Kaam +' },
  createNewQuest: { en: 'Create New Karma Quest', hi: 'Naya Kaam Daal Do! ✍️' },
  questTitlePlaceholder: { en: 'Enter quest title...', hi: 'Kya karna hai likh do...' },
  difficulty: { en: 'Difficulty', hi: 'Kitna Mushkil?' },
  category: { en: 'Category', hi: 'Type Kya Hai?' },
  cancel: { en: 'Cancel', hi: 'Rehne Do' },
  createQuest: { en: 'Create Quest 🏹', hi: 'Daal Do! 🚀' },
  activeQuests: { en: 'Active Quests', hi: 'Abhi Karne Hai' },
  completed: { en: 'Completed', hi: 'Ho Gaye ✅' },
  punyaEarned: { en: 'Punya Earned', hi: 'XP Kamaya' },
  noQuests: { en: 'No quests here!', hi: 'Koi kaam nahi hai bhai!' },
  noQuestsSub: { en: 'Create a new karma quest to begin your journey.', hi: 'Naya kaam daal ke shuru karo apna grind!' },
  all: { en: 'All', hi: 'Sab' },
  active: { en: 'Active', hi: 'Pending' },

  // ── NEW: Due date labels ───────────────────────────────────────────────────
  dueDateLabel:   { en: 'Due Date',         hi: 'Kab Tak Karna Hai?' },
  noDueDate:      { en: 'No due date',       hi: 'Koi deadline nahi' },
  overdueLabel:   { en: 'Overdue!',          hi: 'Bhai Late Ho Gaye! 😬' },
  dueTodayLabel:  { en: 'Due Today',         hi: 'Aaj Karna Hai!' },
  dueSoonLabel:   { en: 'Due Soon',          hi: 'Jaldi Karo!' },
  overdueCount:   { en: 'overdue',           hi: 'late' },
  recurringLabel: { en: 'Recurring',         hi: 'Roz/Wkly?' },
  recurrenceNone: { en: 'Not recurring',     hi: 'Normal' },
  recurrenceDaily:{ en: 'Daily',             hi: 'Roz' },
  recurrenceWeekly:{ en: 'Weekly',           hi: 'Hafte ka' },
  badgeLabel:     { en: 'Title Badge',       hi: 'Badge' },
  checklistLabel: { en: 'Checklist',         hi: 'Checklist' },
  addSubtaskPlaceholder: { en: 'Add a sub-task...', hi: 'Sub-task daalo...' },
  completeSubtasksFirst: { en: 'Complete all sub-tasks first', hi: 'Pehle saare sub-tasks complete karo' },
  // ──────────────────────────────────────────────────────────────────────────

  // Shop
  shopTitle: { en: 'Mudra Shop', hi: 'Mudra Dukaan 🛍️' },
  shopSub: { en: 'Spend coins on cosmetics and power-ups', hi: 'Coins kharch karo — style + power!' },
  shopCoins: { en: 'Your coins', hi: 'Tere coins' },
  shopBuy: { en: 'Buy', hi: 'Kharido' },
  shopEquip: { en: 'Equip', hi: 'Laga do' },
  shopEquipped: { en: 'Equipped', hi: 'Lag gaya' },
  shopOwned: { en: 'Owned', hi: 'Mil gaya' },
  shopNotEnough: { en: 'Not enough coins', hi: 'Coins kam hai' },
  shopActiveBoost: { en: 'Active XP Boost', hi: 'XP Boost ON' },

  // Notes Vault
  notesTitle: { en: 'Vidya Scrolls', hi: 'Gyaan Ki Potli 📚' },
  notesSub: { en: 'Your collection of knowledge scrolls', hi: 'Yahan pe sab notes safe hai boss!' },
  newScroll: { en: 'New Scroll 🪷', hi: 'Naya Note + 📝' },
  searchNotes: { en: 'Search through your vidya scrolls...', hi: 'Notes mein kuch dhoondho...' },
  inscribeScroll: { en: '🪷 Inscribe New Vidya Scroll', hi: '📝 Naya Gyaan Likho!' },
  scrollIcon: { en: 'Icon', hi: 'Emoji Lagao' },
  scrollColor: { en: 'Color', hi: 'Colour Choose Karo' },
  scrollTitle: { en: 'Scroll title...', hi: 'Title daal do...' },
  scrollContent: { en: 'Write your knowledge here...', hi: 'Gyaan likho yahan pe...' },
  scrollTags: { en: 'Tags (comma separated): React, Vidya, Karma', hi: 'Tags daalo (comma se): React, Padhai, Kaam' },
  createScroll: { en: 'Create Scroll 📜', hi: 'Save Karo! 💾' },
  noScrolls: { en: 'No scrolls found!', hi: 'Koi note nahi mila!' },
  noScrollsSub: { en: 'Create a new vidya scroll to store your knowledge.', hi: 'Naya note daal ke apna gyaan save karo!' },
  deleteScroll: { en: 'Delete Scroll', hi: 'Delete Kar Do 🗑️' },

  // Achievements
  achievementsTitle: { en: 'Siddhi Hall', hi: 'Trophy Room 🏆' },
  achievementsSub: { en: 'Your legendary accomplishments & divine blessings', hi: 'Tumhari saari trophies aur achievements yahan hai!' },
  siddhiUnlocked: { en: 'Siddhi Unlocked', hi: 'Trophy Mili!' },
  totalExperience: { en: 'Total Experience', hi: 'Total XP' },
  untilNextSiddhi: { en: 'Until Next Siddhi', hi: 'Agle Trophy Tak' },
  nextSiddhi: { en: 'Next Siddhi', hi: 'Agla Target' },
  punyaNeeded: { en: 'Punya needed', hi: 'XP chahiye' },
  earnedSiddhi: { en: 'Earned Siddhi', hi: 'Jo Mil Gayi ✅' },
  lockedSiddhi: { en: 'Locked Siddhi', hi: 'Abhi Lock Hai 🔒' },

  // Challenges
  challengesTitle: { en: 'Tapasya Challenges', hi: 'Daily Hustle Challenges 💪' },
  challengesSub: { en: 'Complete challenges for bonus Punya and rewards', hi: 'Challenges complete karo aur extra XP kamao!' },
  dailyReset: { en: 'Daily Reset', hi: 'Daily Reset' },
  dailyResetSub: { en: 'Challenges refresh every day at midnight', hi: 'Raat 12 baje naye challenges aayenge!' },
  untilReset: { en: 'until reset', hi: 'reset mein' },
  dailyKarma: { en: '🏹 Daily Karma Quests', hi: '💪 Aaj Ke Targets' },
  weeklyCampaigns: { en: '🏰 Weekly Campaigns', hi: '📅 Hafte Ka Goal' },
  specialMissions: { en: '👑 Special Missions', hi: '⭐ Special Wale' },
  jaiHo: { en: 'JAI HO!', hi: 'BHAI WAAH! 🎉' },

  // Difficulty labels
  diffSahaj: { en: 'Sahaj', hi: 'Easy Peasy' },
  diffMadhyam: { en: 'Madhyam', hi: 'Thoda Tough' },
  diffKathin: { en: 'Kathin', hi: 'Mushkil Hai' },
  diffDivya: { en: 'Divya', hi: 'Bohot Hard! 😰' },

  // XP Popup
  xpGained: { en: 'Punya', hi: 'XP Mila!' },
  karmaQuestComplete: { en: 'Karma Quest Complete!', hi: 'Kaam Ho Gaya Bhai! 🎊' },

  // Motivational quotes
  quotes: {
    en: [
      "कर्मण्येवाधिकारस्ते – Focus on your Karma! 🙏",
      "Your Tapasya streak is your superpower! 🪔",
      "Level up like Arjuna mastered the bow! 🏹",
      "Every quest is a step on the path of Dharma! 🕉️",
      "Vidya scrolls make you wiser than Narada! 📜",
      "Today's Karma is tomorrow's Punya! 🪷",
      "You walk the path of greatness, Yoddha! 🌟",
      "Consistency is the ultimate Sadhana! 🎯",
    ],
    hi: [
      "Bhai kaam karo, result ki chinta mat karo! 💪",
      "Streak todna nahi hai, samjhe? 🔥",
      "Arjuna bhi aise hi grind karta tha! 🏹",
      "Har kaam ek step hai success ki taraf! 🚀",
      "Notes banao, smart bano, topper bano! 📚",
      "Aaj mehnat karoge, kal maze karoge! 🎯",
      "Tu toh champion hai bhai! 🏆",
      "Consistency is king, bro! Roz karo! 👑",
      "Uth ja bhai, duniya jeet ni hai! ☀️",
      "Apna time aa gaya hai! 🌟",
    ],
  },

  // Focus Timer
  focusStart: { en: 'Focus 25m', hi: 'Focus 25m' },
  focusStop: { en: 'Stop', hi: 'Rok do' },
  focusInProgress: { en: 'In Focus', hi: 'Focus Mode' },
  focusCompleteTitle: { en: 'Focus Complete! ⏱️', hi: 'Focus Ho Gaya! ⏱️' },
  focusCompleteMsg: { en: 'Pomodoro finished. +5 bonus XP earned.', hi: 'Pomodoro complete. +5 bonus XP mila.' },
  focusStartedTitle: { en: 'Focus Started ⏱️', hi: 'Focus Start ⏱️' },
  focusStartedMsg: { en: '25 minutes on this quest. Stay in flow.', hi: '25 min ka focus. Flow mein raho.' },

  // Theme names
  themeLight: { en: 'Saffron Light', hi: 'Light Mode' },
  themeDark: { en: 'Indigo Dark', hi: 'Dark Mode' },
  themeHinglish: { en: 'Hinglish Vibe', hi: 'Hinglish Mode' },

  // Challenge titles
  challengeBrahmaMuhurta: { en: 'Brahma Muhurta', hi: 'Subah Ka Hustle 🌅' },
  challengeBrahmaDesc: { en: 'Complete 3 quests before noon', hi: 'Dopahar se pehle 3 kaam karo' },
  challengeVidyaSeeker: { en: 'Vidya Seeker', hi: 'Padhai Karo Yaar 📖' },
  challengeVidyaDesc: { en: 'Create 2 new scrolls today', hi: 'Aaj 2 naye notes banao' },
  challengeTapasyaGuard: { en: 'Tapasya Guardian', hi: 'Streak Mat Tootne Dena 🪔' },
  challengeTapasyaDesc: { en: 'Maintain your daily streak', hi: 'Roz aana hai, streak bachani hai' },
  challengeKarmaStorm: { en: 'Karma Storm', hi: 'Aandhi Laa Do ⚡' },
  challengeKarmaStormDesc: { en: 'Complete 5 quests in a single day', hi: 'Ek din mein 5 kaam khatam karo' },
  challengeRavanaSlayer: { en: 'Ravana Slayer', hi: 'Raavan Ko Maaro 🔱' },
  challengeRavanaDesc: { en: 'Complete 15 quests this week', hi: 'Hafte mein 15 kaam complete karo' },
  challengeScrollMaster: { en: 'Scroll Master', hi: 'Notes Ka Baap 📜' },
  challengeScrollDesc: { en: 'Accumulate 10 knowledge scrolls', hi: '10 notes collect karo' },
  challengeDivyaGrind: { en: 'Divya Grind', hi: 'XP Ka Jackpot 💎' },
  challengeDivyaDesc: { en: 'Earn 500 Punya in one week', hi: 'Ek hafte mein 500 XP kamao' },
  challengeAsuraRush: { en: 'Asura Rush', hi: 'Boss Level Kaam 👑' },
  challengeAsuraDesc: { en: 'Complete 3 Kathin or Divya quests', hi: '3 mushkil waale kaam karo' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key];
  if (!entry) return key;
  if (key === 'quotes') return '';
  return (entry as Record<Lang, string>)[lang] || (entry as Record<Lang, string>).en;
}

export function getQuotes(lang: Lang): readonly string[] {
  return translations.quotes[lang];
}

export default translations;
