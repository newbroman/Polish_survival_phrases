/**
 * app-data.js
 * Contains global variables, phonetic alphabet hints, 
 * and persistent settings.
 */

// PHONETIC ALPHABET GUIDE (Level 0)
// Format: { phonetic_sound, emoji_hint }
const alphaHints = {
    'A': { h: 'ah', e: '🚗', j: 'auto' },
    'Ą': { h: 'own', e: '🌾', j: 'pająk' },
    'B': { h: 'b', e: '👞', j: 'buty' },
    'C': { h: 'ts', e: '🍬', j: 'cytryna' },
    'Ć': { h: 'ch!', e: '🦋', j: 'ćma' },
    'D': { h: 'd', e: '🏠', j: 'dom' },
    'E': { h: 'eh', e: '📱', j: 'ekran' },
    'Ę': { h: 'en', e: 'Swan', j: 'gęś' },
    'F': { h: 'f', e: '🎨', j: 'farba' },
    'G': { h: 'g', e: '🏔️', j: 'góra' },
    'H': { h: 'h', e: '🍵', j: 'herbata' },
    'I': { h: 'ee', e: '🆔', j: 'igła' },
    'J': { h: 'y', e: '🥚', j: 'jajko' },
    'K': { h: 'k', e: '🐱', j: 'kot' },
    'L': { h: 'l', e: '💡', j: 'lampa' },
    'Ł': { h: 'w', e: '⛵', j: 'łyżka' },
    'M': { h: 'm', e: '👩', j: 'mama' },
    'N': { h: 'n', e: '🌙', j: 'nos' },
    'Ń': { h: 'ny', e: '🐎', j: 'słoń' },
    'O': { h: 'oh', e: '🪟', j: 'okno' },
    'Ó': { h: 'oo', e: '🌳', j: 'ołówki' },
    'P': { h: 'p', e: '🐶', j: 'pies' },
    'R': { h: 'r', e: '✋', j: 'rower' },
    'S': { h: 's', e: '🧀', j: 'ser' },
    'Ś': { h: 'sh!', e: '❄️', j: 'ślimak' },
    'T': { h: 't', e: '👍', j: 'tata' },
    'U': { h: 'oo', e: '👂', j: 'ucho' },
    'W': { h: 'v', e: '💧', j: 'woda' },
    'Y': { h: 'i', e: '👦', j: 'ryba' },
    'Z': { h: 'z', e: '🦷', j: 'zegar' },
    'Ź': { h: 'zh!', e: '👎', j: 'źrebię' },
    'Ż': { h: 'zh', e: '🐸', j: 'żaba' }
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
