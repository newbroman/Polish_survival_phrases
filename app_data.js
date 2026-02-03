/**
 * app-data.js
 * Contains global variables, phonetic alphabet hints, 
 * and persistent settings.
 */

// PHONETIC ALPHABET GUIDE (Level 0)
// Format: { phonetic_sound, emoji_hint }
const alphaHints = {
    'A': { h: 'ah', e: '🚗' },    'Ą': { h: 'own', e: '🌾' },   'B': { h: 'b', e: '👞' },
    'C': { h: 'ts', e: '🍬' },    'Ć': { h: 'ch!', e: '🦋' },   'CH': { h: 'h', e: '🍞' },
    'CZ': { h: 'ch', e: '⏱️' },   'D': { h: 'd', e: '🏠' },    'DZ': { h: 'dz', e: '🔔' },
    'DŹ': { h: 'j!', e: '🔊' },   'DŻ': { h: 'j', e: '🍓' },    'E': { h: 'eh', e: '📱' },
    'Ę': { h: 'en', e: '🦢' },    'F': { h: 'f', e: '🎨' },    'G': { h: 'g', e: '🏔️' },
    'H': { h: 'h', e: '🍵' },     'I': { h: 'ee', e: '🆔' },   'J': { h: 'y', e: '🥚' },
    'K': { h: 'k', e: '🐱' },     'L': { h: 'l', e: '💡' },    'Ł': { h: 'w', e: '⛵' },
    'M': { h: 'm', e: '👩' },     'N': { h: 'n', e: '🌙' },    'Ń': { h: 'ny', e: '🐎' },
    'O': { h: 'oh', e: '🪟' },    'Ó': { h: 'oo', e: '🌳' },   'P': { h: 'p', e: '🐶' },
    'R': { h: 'r', e: '✋' },     'RZ': { h: 'zh', e: '🌊' },   'S': { h: 's', e: '🧀' },
    'Ś': { h: 'sh!', e: '❄️' },   'SZ': { h: 'sh', e: '👗' },   'T': { h: 't', e: '👍' },
    'U': { h: 'oo', e: '👂' },    'W': { h: 'v', e: '💧' },    'Y': { h: 'i', e: '👦' },
    'Z': { h: 'z', e: '🦷' },     'Ź': { h: 'zh!', e: '👎' },  'Ż': { h: 'zh', e: '🐸' }
};

// GLOBAL APP STATE
let phrasesData = [];      // Full list from the current JSON file
let activePool = [];       // Only phrases still being learned
let currentTarget = null;  // The phrase currently being asked
let currentLevel = parseInt(localStorage.getItem('pl_current_level')) || 0;
let stats = JSON.parse(localStorage.getItem('pl_stats')) || {};

// USER PREFERENCES
let isSwapped = (localStorage.getItem('pl_swap') === 'true');
let currentGender = localStorage.getItem('pl_gender') || 'm'; // 'm' or 'f'
let uiLang = localStorage.getItem('pl_ui_lang') || 'EN';

// APP CONSTANTS
const THRESHOLD = 3; // How many times a phrase must be correct to move to "Banked"

// UI TEXT DICTIONARY
const uiTexts = {
    'EN': {
        learning: 'LEARNING',
        bank: 'BANK',
        reset: 'Reset Progress',
        nextLevel: 'Next Level',
        victory: 'LEVEL COMPLETE! 🏆'
    },
    'PL': {
        learning: 'NAUKA',
        bank: 'BANK',
        reset: 'Resetuj Postęp',
        nextLevel: 'Następny Poziom',
        victory: 'POZIOM ZALICZONY! 🏆'
    }
};
