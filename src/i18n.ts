export type Lang = 'en' | 'hi' | 'pro';

const translations = {
  // App-level
  appName: { en: 'KarmQuest', hi: 'KarmQuest 🪔', pro: 'Field Notes' },
  appTagline: { en: 'Level Up Your Karma', hi: 'Apna Karma Level Up Karo!', pro: 'Thoughtful tasks. Clear weeks.' },

  // Sidebar
  navDashboard: { en: 'Dashboard', hi: 'Ghar 🏠', pro: 'Overview' },
  navQuests: { en: 'Karma Quests', hi: 'Kaam-Dhaam 💪', pro: 'Tasks' },
  navNotes: { en: 'Vidya Scrolls', hi: 'Gyaan Ki Potli 🧠', pro: 'Notes' },
  navAchievements: { en: 'Siddhi Hall', hi: 'Trophy Room 🏆', pro: 'Milestones' },
  navChallenges: { en: 'Tapasya', hi: 'Daily Hustle 🔥', pro: 'Challenges' },
  navShop: { en: 'Mudra Shop', hi: 'Dukaan 🛍️', pro: 'Store' },
  navLeaderboard: { en: 'Leaderboard', hi: 'Leaderboard 🏅', pro: 'Leaderboard' },
  navSettings: { en: 'Settings', hi: 'Setting-Wetting ⚙️', pro: 'Settings' },

  // TopNav
  searchPlaceholder: { en: 'Search quests, scrolls...', hi: 'Kuch bhi dhoondho yahan...', pro: 'Search tasks, notes…' },
  levelLabel: { en: 'Lvl', hi: 'Level', pro: 'Level' },
  daysLabel: { en: 'days', hi: 'din', pro: 'days' },

  // Dashboard
  welcomeGreeting: { en: 'Namaste', hi: 'Kya haal hai', pro: 'Welcome' },
  welcomeTitle: { en: "Ready for Today's Karma? 🪔", hi: "Aaj ka kaam shuru karein? Let's goooo! 🚀", pro: 'Plan today. Finish strong.' },
  startQuest: { en: 'Start Your Quest 🏹', hi: 'Chalo Shuru Karte Hai! 💥', pro: 'Add a task' },
  todaysKarma: { en: "Today's Karma", hi: 'Aaj Ka Score', pro: 'Today' },
  questsDone: { en: 'quests done', hi: 'kaam ho gaye', pro: 'tasks done' },
  totalPunya: { en: 'Total Punya', hi: 'Total XP Bhai', pro: 'Total XP' },
  chakraLabel: { en: 'Chakra', hi: 'Level', pro: 'Level' },
  goldMudras: { en: 'Gold Mudras', hi: 'Paisa Hi Paisa 💰', pro: 'Coins' },
  keepGrinding: { en: 'Keep grinding!', hi: 'Aur kamao bhai!', pro: 'Keep it going.' },
  siddhiLabel: { en: 'Siddhi', hi: 'Trophies', pro: 'Milestones' },
  unlocked: { en: 'unlocked', hi: 'mil gayi!', pro: 'unlocked' },
  karmaProgress: { en: 'Karma Progress', hi: 'Kitna Kaam Hua?', pro: 'Progress' },
  complete: { en: 'Complete', hi: 'Done hai!', pro: 'Complete' },
  recentScrolls: { en: 'Recent Scrolls', hi: 'Latest Gyaan', pro: 'Recent notes' },
  viewAll: { en: 'View All', hi: 'Sab Dekho', pro: 'View all' },
  tapasyaStreak: { en: 'Tapasya Streak', hi: 'Streak Chal Rahi Hai 🔥', pro: 'Streak' },
  daysOfSadhana: { en: 'Days of Sadhana!', hi: 'Din Se Grind On Hai!', pro: 'day streak' },
  jaiHoYoddha: { en: 'Jai Ho, Yoddha! 🙏', hi: 'Kya Baat Hai Bhai! 🤜🤛', pro: 'Nice work.' },
  daysUntilBonus: { en: 'days until bonus punya!', hi: 'din mein bonus milega!', pro: 'days until bonus XP.' },
  weeklyAsura: { en: 'Weekly Asura Challenge', hi: 'Hafta Wala Boss Fight', pro: 'Weekly goal' },
  ravanaTitle: { en: 'Ravana of Distractions', hi: 'Distraction Ka Raavan 👹', pro: 'Distraction detox' },
  ravanaDesc: { en: 'Complete 15 quests this week to defeat the Asura!', hi: 'Is hafte 15 kaam karo aur Raavan ko harao!', pro: 'Complete 15 tasks this week.' },
  questsLabel: { en: 'quests', hi: 'kaam', pro: 'tasks' },
  rewardLabel: { en: 'Reward', hi: 'Inam', pro: 'Reward' },

  // Quest Board
  questBoardTitle: { en: 'Karma Quest Board', hi: 'Kaam-Dhaam Board 📋', pro: 'Task Board' },
  questBoardSub: { en: 'Accept and conquer your daily quests', hi: 'Aaj ke kaam accept karo aur khatam karo!', pro: 'Capture, plan, and finish work.' },
  newQuest: { en: 'New Quest', hi: 'Naya Kaam +', pro: 'New task' },
  createNewQuest: { en: 'Create New Karma Quest', hi: 'Naya Kaam Daal Do! ✍️', pro: 'Add a new task' },
  questTitlePlaceholder: { en: 'Enter quest title...', hi: 'Kya karna hai likh do...', pro: 'Task title…' },
  difficulty: { en: 'Difficulty', hi: 'Kitna Mushkil?' },
  category: { en: 'Category', hi: 'Type Kya Hai?' },
  cancel: { en: 'Cancel', hi: 'Rehne Do' },
  createQuest: { en: 'Create Quest 🏹', hi: 'Daal Do! 🚀', pro: 'Add task' },
  activeQuests: { en: 'Active Quests', hi: 'Abhi Karne Hai', pro: 'Active tasks' },
  completed: { en: 'Completed', hi: 'Ho Gaye ✅', pro: 'Completed' },
  punyaEarned: { en: 'Punya Earned', hi: 'XP Kamaya', pro: 'XP earned' },
  noQuests: { en: 'No quests here!', hi: 'Koi kaam nahi hai bhai!', pro: 'No tasks yet.' },
  noQuestsSub: { en: 'Create a new karma quest to begin your journey.', hi: 'Naya kaam daal ke shuru karo apna grind!', pro: 'Add a task to get started.' },
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
  shopTitle: { en: 'Mudra Shop', hi: 'Mudra Dukaan 🛍️', pro: 'Store' },
  shopSub: { en: 'Spend coins on cosmetics and power-ups', hi: 'Coins kharch karo — style + power!', pro: 'Cosmetics and boosters.' },
  shopCoins: { en: 'Your coins', hi: 'Tere coins', pro: 'Your coins' },
  shopBuy: { en: 'Buy', hi: 'Kharido' },
  shopEquip: { en: 'Equip', hi: 'Laga do' },
  shopEquipped: { en: 'Equipped', hi: 'Lag gaya' },
  shopOwned: { en: 'Owned', hi: 'Mil gaya' },
  shopNotEnough: { en: 'Not enough coins', hi: 'Coins kam hai' },
  shopActiveBoost: { en: 'Active XP Boost', hi: 'XP Boost ON' },

  // Notes Vault
  notesTitle: { en: 'Vidya Scrolls', hi: 'Gyaan Ki Potli 📚', pro: 'Notes' },
  notesSub: { en: 'Your collection of knowledge scrolls', hi: 'Yahan pe sab notes safe hai boss!', pro: 'Keep context close to the work.' },
  newScroll: { en: 'New Scroll 🪷', hi: 'Naya Note + 📝', pro: 'New note' },
  searchNotes: { en: 'Search through your vidya scrolls...', hi: 'Notes mein kuch dhoondho...', pro: 'Search notes…' },
  inscribeScroll: { en: '🪷 Inscribe New Vidya Scroll', hi: '📝 Naya Gyaan Likho!', pro: 'Create a note' },
  scrollIcon: { en: 'Icon', hi: 'Emoji Lagao' },
  scrollColor: { en: 'Color', hi: 'Colour Choose Karo' },
  scrollTitle: { en: 'Scroll title...', hi: 'Title daal do...', pro: 'Note title…' },
  scrollContent: { en: 'Write your knowledge here...', hi: 'Gyaan likho yahan pe...', pro: 'Write here…' },
  scrollTags: { en: 'Tags (comma separated): React, Vidya, Karma', hi: 'Tags daalo (comma se): React, Padhai, Kaam' },
  createScroll: { en: 'Create Scroll 📜', hi: 'Save Karo! 💾', pro: 'Save note' },
  noScrolls: { en: 'No scrolls found!', hi: 'Koi note nahi mila!', pro: 'No notes found.' },
  noScrollsSub: { en: 'Create a new vidya scroll to store your knowledge.', hi: 'Naya note daal ke apna gyaan save karo!', pro: 'Create a note to capture details and decisions.' },
  deleteScroll: { en: 'Delete Scroll', hi: 'Delete Kar Do 🗑️', pro: 'Delete note' },
  attachments: { en: 'Attachments', hi: 'Files 📎' },

  // Analytics
  categoryAnalyticsTitle: { en: 'Category Analytics', hi: 'Category Analytics 📊' },
  categoryAnalyticsSub: { en: 'XP earned by category (last 7 days)', hi: 'Last 7 din ka XP breakdown' },
  last7Days: { en: 'Last 7 days', hi: 'Last 7 din' },
  categoryAnalyticsEmpty: { en: 'No completed quests in the last 7 days.', hi: 'Last 7 din mein koi completed quest nahi.' },

  // Achievements
  achievementsTitle: { en: 'Siddhi Hall', hi: 'Trophy Room 🏆', pro: 'Milestones' },
  achievementsSub: { en: 'Your legendary accomplishments & divine blessings', hi: 'Tumhari saari trophies aur achievements yahan hai!', pro: 'Progress you can actually see.' },
  siddhiUnlocked: { en: 'Siddhi Unlocked', hi: 'Trophy Mili!', pro: 'Unlocked' },
  totalExperience: { en: 'Total Experience', hi: 'Total XP', pro: 'Total XP' },
  untilNextSiddhi: { en: 'Until Next Siddhi', hi: 'Agle Trophy Tak', pro: 'Until next' },
  nextSiddhi: { en: 'Next Siddhi', hi: 'Agla Target', pro: 'Next milestone' },
  punyaNeeded: { en: 'Punya needed', hi: 'XP chahiye', pro: 'XP needed' },
  earnedSiddhi: { en: 'Earned Siddhi', hi: 'Jo Mil Gayi ✅', pro: 'Unlocked' },
  lockedSiddhi: { en: 'Locked Siddhi', hi: 'Abhi Lock Hai 🔒', pro: 'Locked' },

  // Challenges
  challengesTitle: { en: 'Tapasya Challenges', hi: 'Daily Hustle Challenges 💪', pro: 'Challenges' },
  challengesSub: { en: 'Complete challenges for bonus Punya and rewards', hi: 'Challenges complete karo aur extra XP kamao!', pro: 'Small goals with extra rewards.' },
  dailyReset: { en: 'Daily Reset', hi: 'Daily Reset' },
  dailyResetSub: { en: 'Challenges refresh every day at midnight', hi: 'Raat 12 baje naye challenges aayenge!' },
  untilReset: { en: 'until reset', hi: 'reset mein' },
  dailyKarma: { en: '🏹 Daily Karma Quests', hi: '💪 Aaj Ke Targets', pro: 'Daily goals' },
  weeklyCampaigns: { en: '🏰 Weekly Campaigns', hi: '📅 Hafte Ka Goal', pro: 'Weekly goals' },
  specialMissions: { en: '👑 Special Missions', hi: '⭐ Special Wale', pro: 'Long-term' },
  jaiHo: { en: 'JAI HO!', hi: 'BHAI WAAH! 🎉', pro: 'Done' },

  // Difficulty labels
  diffSahaj: { en: 'Sahaj', hi: 'Easy Peasy', pro: 'Easy' },
  diffMadhyam: { en: 'Madhyam', hi: 'Thoda Tough', pro: 'Medium' },
  diffKathin: { en: 'Kathin', hi: 'Mushkil Hai', pro: 'Hard' },
  diffDivya: { en: 'Divya', hi: 'Bohot Hard! 😰', pro: 'Stretch' },

  // XP Popup
  xpGained: { en: 'Punya', hi: 'XP Mila!', pro: 'XP' },
  karmaQuestComplete: { en: 'Karma Quest Complete!', hi: 'Kaam Ho Gaya Bhai! 🎊', pro: 'Task complete' },

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
    pro: [
      'Write it down. Pick one. Finish it.',
      'Small tasks, done daily, beat big plans.',
      'Clarity is a feature. Keep it simple.',
      'Review the week. Protect your attention.',
      "If it's important, schedule it.",
      'One clean list is better than five messy ones.',
    ],
  },

  // Focus Timer
  focusStart: { en: 'Focus 25m', hi: 'Focus 25m', pro: 'Focus 25m' },
  focusStop: { en: 'Stop', hi: 'Rok do', pro: 'Stop' },
  focusInProgress: { en: 'In Focus', hi: 'Focus Mode', pro: 'In focus' },
  focusCompleteTitle: { en: 'Focus Complete! ⏱️', hi: 'Focus Ho Gaya! ⏱️', pro: 'Focus complete' },
  focusCompleteMsg: { en: 'Pomodoro finished. +5 bonus XP earned.', hi: 'Pomodoro complete. +5 bonus XP mila.', pro: 'Pomodoro finished. +5 bonus XP.' },
  focusStartedTitle: { en: 'Focus Started ⏱️', hi: 'Focus Start ⏱️', pro: 'Focus started' },
  focusStartedMsg: { en: '25 minutes on this quest. Stay in flow.', hi: '25 min ka focus. Flow mein raho.', pro: '25 minutes on this task. Stay in flow.' },

  // Theme names
  themeLight: { en: 'Saffron Light', hi: 'Light Mode', pro: 'Warm Light' },
  themeModern: { en: 'Field Notes', hi: 'Modern', pro: 'Field Notes' },
  // Theme 3 (mode: dark) is Chakra Rings, but it is a LIGHT palette.
  themeDark: { en: 'Chakra Rings', hi: 'Chakra Rings', pro: 'Chakra Rings' },
  // Theme 4 (mode: hinglish) is Indigo Dark.
  themeHinglish: { en: 'Indigo Dark', hi: 'Indigo Dark', pro: 'Indigo Dark' },

  // Challenge titles
  challengeBrahmaMuhurta: { en: 'Brahma Muhurta', hi: 'Subah Ka Hustle 🌅', pro: 'Morning momentum' },
  challengeBrahmaDesc: { en: 'Complete 3 quests before noon', hi: 'Dopahar se pehle 3 kaam karo', pro: 'Finish 3 tasks before noon.' },
  challengeVidyaSeeker: { en: 'Vidya Seeker', hi: 'Padhai Karo Yaar 📖', pro: 'Capture notes' },
  challengeVidyaDesc: { en: 'Create 2 new scrolls today', hi: 'Aaj 2 naye notes banao', pro: 'Create 2 notes today.' },
  challengeTapasyaGuard: { en: 'Tapasya Guardian', hi: 'Streak Mat Tootne Dena 🪔', pro: 'Stay consistent' },
  challengeTapasyaDesc: { en: 'Maintain your daily streak', hi: 'Roz aana hai, streak bachani hai', pro: 'Log a focus session today.' },
  challengeKarmaStorm: { en: 'Karma Storm', hi: 'Aandhi Laa Do ⚡', pro: 'Big day' },
  challengeKarmaStormDesc: { en: 'Complete 5 quests in a single day', hi: 'Ek din mein 5 kaam khatam karo', pro: 'Finish 5 tasks today.' },
  challengeRavanaSlayer: { en: 'Ravana Slayer', hi: 'Raavan Ko Maaro 🔱', pro: 'Weekly milestone' },
  challengeRavanaDesc: { en: 'Complete 15 quests this week', hi: 'Hafte mein 15 kaam complete karo', pro: 'Finish 15 tasks this week.' },
  challengeScrollMaster: { en: 'Scroll Master', hi: 'Notes Ka Baap 📜', pro: 'Build your system' },
  challengeScrollDesc: { en: 'Accumulate 10 knowledge scrolls', hi: '10 notes collect karo', pro: 'Create 10 notes this week.' },
  challengeDivyaGrind: { en: 'Divya Grind', hi: 'XP Ka Jackpot 💎', pro: 'Earn XP' },
  challengeDivyaDesc: { en: 'Earn 500 Punya in one week', hi: 'Ek hafte mein 500 XP kamao', pro: 'Earn 500 XP this week.' },
  challengeAsuraRush: { en: 'Asura Rush', hi: 'Boss Level Kaam 👑', pro: 'Stretch tasks' },
  challengeAsuraDesc: { en: 'Complete 3 Kathin or Divya quests', hi: '3 mushkil waale kaam karo', pro: 'Finish 3 hard or stretch tasks.' },
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
