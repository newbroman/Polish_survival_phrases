// ==========================================
// CORE CONSTANTS & STATE
// ==========================================
export const THRESHOLD = 3;
export const MIN_SCORE = -2;
export const TIME_SLOW = 4000;
export const TIME_DISTRACTED = 12000;

export const state = {
    stats: JSON.parse(localStorage.getItem('pl_mastery_final')) || {},
    currentLevel: localStorage.getItem('pl_current_level_idx') || "0",
    userData: JSON.parse(localStorage.getItem('pl_user_data')) || {
        totalPoints: 0,
        dailyPoints: 0,
        lastPlayDate: new Date().toDateString(),
        bestStreak: 0,
        badges: [],
        levelCompletions: {},
        dailyStreak: 0,
        lastGoalDate: null
    },
    customPhrases: JSON.parse(localStorage.getItem('pl_custom_level')) || {
        level: "C",
        description: "My Custom Phrases",
        phrases: []
    },
    customLevels: JSON.parse(localStorage.getItem('pl_custom_levels')) || [],
    openAIKey: localStorage.getItem('pl_openai_key') || "",
    phrasesData: [],
    activePool: [],
    levelList: [],
    allPhrasesCache: [],
    currentTarget: null,
    currentPlaybackSpeed: 1.0,
    studyNotesVisible: true,
    recentPhrasesQueue: [],
    isSwapped: false,
    hardMode: false,
    correctStreak: 0,
    studyIndex: 0,
    plVoice: null,
    audioCtx: null,
    audioKeepAliveInterval: null,
    basePitch: 220,
    questionStartTime: 0,
    roundTimer: null,
    isTimerPaused: false,
    isGamePaused: false,
    isAudioPaused: false,
    uiLang: localStorage.getItem('polishMasterUILang') || 'en'
};

// Ensure backwards compatibility with older saves
if (state.userData.dailyStreak === undefined) state.userData.dailyStreak = 0;
if (state.userData.lastGoalDate === undefined) state.userData.lastGoalDate = null;
if (!state.userData.levelCompletions) state.userData.levelCompletions = {};

// Migrate SRS object structure 
let statsMigrated = false;
for (let key in state.stats) {
    if (typeof state.stats[key] === 'number') {
        state.stats[key] = {
            score: state.stats[key],
            interval: state.stats[key] >= THRESHOLD ? 1 : 0,
            nextReview: state.stats[key] >= THRESHOLD ? Date.now() + 86400000 : 0
        };
        statsMigrated = true;
    }
}
if (statsMigrated) {
    localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
}

// Helper function to calculate the next SRS interval (in days)
export function getNextInterval(currentInterval) {
    if (currentInterval === 0) return 1;
    if (currentInterval === 1) return 3;
    if (currentInterval === 3) return 7;
    if (currentInterval === 7) return 14;
    if (currentInterval === 14) return 30;
    return currentInterval * 2;
}

// Helper function to check if a phrase should appear in Level R
export function isDueForReview(p) {
    let s = state.stats[p.pl];
    if (!s) return false;

    // Include if they are actively struggling with it right now
    if (s.score < 0) return true;

    // Include if they have mastered it before, but the review date has passed
    if (s.score >= THRESHOLD && s.nextReview <= Date.now()) return true;

    return false;
}
