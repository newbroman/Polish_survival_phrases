import { state, THRESHOLD, isDueForReview } from './state.js';
import { initAudioContext, speak, stopListening, toggleMic, isListening, checkSpokenAnswer } from './audio.js';
import { startNewRound, addPoints } from './game.js';
import { scanLibrary, exportCustomLevel } from './storage.js';

// TRANSLATIONS
// ==========================================
export const translations = {
    en: {
        title: "Polish Phrase Master",
        search: "Search dictionary...",
        correct: "Correct! 🌟",
        correctSlow: "Correct! (Too slow)",
        mistake: "Mistake!",
        tooSlow: "Too slow! ⏱️",
        study: "STUDY",
        practice: "PRACTICE",
        banked: "PHRASES",
        save: "💾 Save",
        ready: "Ready?",
        masteredTitle: "Level Mastered!",
        masteredText: "You finished this set.",
        repeatLevel: "Repeat Normal",
        repeatHard: "Repeat in Hard Mode 🧠",
        reviewComplete: "Review Complete!",
        reviewCompleteText: "You have successfully cleared your weak phrases.",
        needsReview: "Needs Review",
        backToStart: "Back to Lvl 1",
        btnSwap: "Swap",
        btnListen: "Listen: Tap (1x) | 2 Taps (0.5x) | 3 Taps (0.25x)",
        btnSpeak: "Speak",
        male: "Male",
        female: "Female",
        both: "Both",
        genderPrefix: "Gender",
        uiPrefix: "UI Language",
        hard: "Hard Mode",
        hf: "Hands-Free Mode",
        btnLoad: "📂 Load",
        btnReset: "⚠️ Reset App Data",
        btnExportC: "📤 Export Sandbox (Lvl C)",
        btnSave: "💾 Save"
    },
    pl: {
        title: "Polskie Zwroty",
        search: "Szukaj w słowniku...",
        correct: "Dobrze! 🌟",
        correctSlow: "Dobrze! (Zbyt wolno)",
        mistake: "Błąd!",
        tooSlow: "Zbyt wolno! ⏱️",
        study: "NAUKA",
        practice: "TRENING",
        banked: "FRAZY",
        save: "💾 Zapisz",
        ready: "Gotowy?",
        masteredTitle: "Poziom opanowany!",
        masteredText: "Ukończyłeś tę kategorię.",
        repeatLevel: "Powtórz (Normalny)",
        repeatHard: "Powtórz w trybie trudnym 🧠",
        reviewComplete: "Powtórka Zakończona!",
        reviewCompleteText: "Pomyślnie powtórzyłeś wszystkie trudne słowa.",
        needsReview: "Do Powtórki",
        backToStart: "Wróc do startu",
        btnSwap: "Zamień",
        btnListen: "Słuchaj: 1 Klik (1x) | 2 Kliki (0.5x) | 3 Kliki (0.25x)",
        btnSpeak: "Mów",
        male: "Mężczyzna",
        female: "Kobieta",
        both: "Oboje",
        genderPrefix: "Rodzaj",
        uiPrefix: "Język Aplikacji",
        hard: "Tryb Trudny",
        hf: "Tryb Wolne Ręce",
        btnLoad: "📂 Wczytaj",
        btnReset: "⚠️ Resetuj Dane",
        btnExportC: "📤 Eksportuj (Poz. C)",
        btnSave: "💾 Zapisz"
    }
};

export function t(key) {
    return translations[state.uiLang][key] || key;
}

// ==========================================
// UI UPDATES & MODALS
// ==========================================
export function updateUILanguage() {
    if (document.getElementById('app-title')) {
        document.getElementById('app-title').innerText = t('title');
    }
    if (document.getElementById('banked-search')) {
        document.getElementById('banked-search').placeholder = t('search');
    }
    if (document.getElementById('lbl-ui-lang-label')) {
        document.getElementById('lbl-ui-lang-label').innerText = t('uiPrefix');
    }
    if (document.getElementById('lbl-ui-lang')) {
        document.getElementById('lbl-ui-lang').innerText = state.uiLang.toUpperCase();
    }

    if (document.getElementById('lbl-hf')) {
        document.getElementById('lbl-hf').innerText = state.uiLang === 'pl' ? '🎧 Tryb Wolne Ręce' : '🎧 Start Hands-Free Mode';
    }

    if (document.getElementById('btn-save')) document.getElementById('btn-save').innerText = t('btnSave');
    if (document.getElementById('btn-load')) document.getElementById('btn-load').innerText = t('btnLoad');
    if (document.getElementById('btn-reset')) document.getElementById('btn-reset').innerText = t('btnReset');
    if (document.getElementById('btn-export-c')) document.getElementById('btn-export-c').innerText = t('btnExportC');

    // Tab Translations
    if (document.getElementById('lbl-tab-study')) {
        document.getElementById('lbl-tab-study').innerText = t('study');
    }
    if (document.getElementById('lbl-tab-practice')) {
        document.getElementById('lbl-tab-practice').innerText = t('practice');
    }
    if (document.getElementById('lbl-tab-banked')) {
        document.getElementById('lbl-tab-banked').innerText = t('banked');
    }

    updateTabCounts();

    if (document.getElementById('lbl-btn-swap')) {
        document.getElementById('lbl-btn-swap').innerText = t('btnSwap');
    }
    if (document.getElementById('lbl-btn-listen')) {
        document.getElementById('lbl-btn-listen').innerText = t('btnListen');
    }
    if (document.getElementById('lbl-btn-speak')) {
        document.getElementById('lbl-btn-speak').innerText = t('btnSpeak');
    }

    // Handle dropdown menu dynamic title
    const file = state.levelList.find(l => l.id == state.currentLevel);
    const lvlElement = document.getElementById('lvl-current');
    if (file && lvlElement) {
        let desc = state.currentLevel === "R" ? t('needsReview') : file.desc;
        let repeats = state.userData.levelCompletions[state.currentLevel] || 0;
        let badge = repeats > 0 ? ` <span style="color:var(--pol-red);font-size:0.8rem;">🔄x${repeats}</span>` : '';
        lvlElement.innerHTML = `<span>Lvl ${state.currentLevel}: ${desc}${badge}</span>`;
    }
}

export function toggleUILang() {
    state.uiLang = state.uiLang === 'en' ? 'pl' : 'en';
    localStorage.setItem('polishMasterUILang', state.uiLang);
    updateUILanguage();
}

export function toggleHelp() {
    const el = document.getElementById('help-overlay');
    const btn = document.getElementById('main-help-btn');

    if (btn) btn.classList.remove('pulse-glow');

    if (el.style.display === 'flex') {
        el.style.display = 'none';
    } else {
        let tm = 0;
        for (let key in state.stats) {
            // Now accessing object score safely instead of legacy integer
            if (state.stats[key] && state.stats[key].score >= THRESHOLD) tm++;
        }
        document.getElementById('stat-mastered').innerText = tm;
        document.getElementById('stat-total-pts').innerText = state.userData.totalPoints;
        document.getElementById('stat-best-streak').innerText = state.userData.bestStreak;

        if (state.userData.badges.length > 0) {
            document.getElementById('stat-badges').innerHTML = state.userData.badges.map(b => `<span class="badge">${b}</span>`).join('');
        }
        el.style.display = 'flex';
    }
}

export function toggleSettings() {
    const el = document.getElementById('settings-overlay');

    if (el.style.display === 'flex') {
        el.style.display = 'none';
    } else {
        renderSettingsCustomLevels();
        el.style.display = 'flex';
    }
}

export function renderSettingsCustomLevels() {
    const container = document.getElementById('settings-custom-levels');
    if (!container) return;

    if (!state.customLevels || state.customLevels.length === 0) {
        container.innerHTML = `<div style="color: #666; font-style: italic;">No custom levels imported yet.</div>`;
        return;
    }

    let html = `<div style="font-weight:bold; margin-bottom: 8px;">Your Imported Levels:</div>`;

    state.customLevels.forEach(cl => {
        const title = cl.data.description || cl.id;
        const phraseCount = cl.data.phrases ? cl.data.phrases.length : 0;

        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.1);">
                <div>
                    <strong style="color: var(--pol-blue);">${title}</strong>
                    <div style="font-size: 0.8em; color: #888;">${phraseCount} phrases</div>
                </div>
                <button onclick="window.deleteCustomLevel('${cl.id}')" style="background: transparent; border: 1px solid var(--pol-red); color: var(--pol-red); border-radius: 4px; padding: 4px 8px; cursor: pointer;">
                    🗑️ Delete
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Phase 2: Grammar Hint Controls
export function showHint() {
    if (!state.currentTarget || !state.currentTarget.note) return;
    state.isTimerPaused = true;
    document.getElementById('hint-text').innerText = state.currentTarget.note;
    document.getElementById('hint-overlay').style.display = 'flex';
}

export function closeHint() {
    state.isTimerPaused = false;
    document.getElementById('hint-overlay').style.display = 'none';
}

// Event listener to close settings, dropdown, or hints when clicking away
window.onclick = (e) => {
    if (!e.target.closest('.settings-dropdown') && !e.target.closest('.icon-btn')) {
        if (document.getElementById('settings-menu')) {
            document.getElementById('settings-menu').classList.remove('show-flex');
        }
    }
    if (!e.target.matches('.main-dropdown-trigger') && !e.target.matches('.main-dropdown-trigger *')) {
        if (document.getElementById('lvl-menu')) {
            document.getElementById('lvl-menu').classList.remove('show');
        }
    }
    if (e.target.matches('#hint-overlay')) {
        closeHint();
    }
};

export function getGenderText(p) {
    return p.pl;
}

// ==========================================
// STUDY MODE (FLASHCARDS)
// ==========================================
export function renderStudyCard() {
    if (!state.phrasesData || state.phrasesData.length === 0) {
        document.getElementById('fc-pl').innerText = "Empty";
        document.getElementById('fc-en').innerText = "";
        document.getElementById('fc-counter').innerText = "0 / 0";
        if (document.getElementById('fc-hint-btn')) document.getElementById('fc-hint-btn').style.display = 'none';
        state.currentTarget = null;
        return;
    }

    if (state.studyIndex < 0) state.studyIndex = state.phrasesData.length - 1;
    if (state.studyIndex >= state.phrasesData.length) state.studyIndex = 0;

    let p = state.phrasesData[state.studyIndex];
    state.currentTarget = p;
    state.currentPlaybackSpeed = 1.0;
    // lbl-btn-listen holds static translated string

    if (p) {
        updateQuestionText();

        const emoji = p.emoji || p.e || '';
        const emojiHtml = emoji ? `<div style="font-size: 2.5rem; margin-bottom: 10px;">${emoji}</div>` : '';

        document.getElementById('fc-pl').innerHTML = `
                    ${emojiHtml}
                    ${state.isSwapped ? p.en : p.pl}
                `;
        document.getElementById('fc-en').innerText = state.isSwapped ? p.pl : p.en;

        let notesHtml = "";
        if (p.note) notesHtml += `<div style="margin-bottom:8px;"><b>Note:</b> ${p.note}</div>`;
        if (p.grammar_1) notesHtml += `<div style="margin-bottom:4px;"><b>G1:</b> ${p.grammar_1}</div>`;
        if (p.grammar_2) notesHtml += `<div style="margin-bottom:4px;"><b>G2:</b> ${p.grammar_2}</div>`;
        if (p.grammar_3) notesHtml += `<div style="margin-bottom:4px;"><b>G3:</b> ${p.grammar_3}</div>`;

        let notesContainer = document.getElementById('fc-notes-container');
        if (notesHtml) {
            notesContainer.innerHTML = notesHtml;
            notesContainer.style.display = state.studyNotesVisible ? 'block' : 'none';
            if (document.getElementById('fc-hint-btn')) document.getElementById('fc-hint-btn').style.display = 'block';
        } else {
            if (notesContainer) notesContainer.style.display = 'none';
            if (document.getElementById('fc-hint-btn')) document.getElementById('fc-hint-btn').style.display = 'none';
        }
    } else {
        document.getElementById('fc-pl').innerText = "Empty";
        document.getElementById('fc-en').innerText = "";
        document.getElementById('fc-counter').innerText = "0 / 0";
        if (document.getElementById('fc-hint-btn')) document.getElementById('fc-hint-btn').style.display = 'none';
        if (document.getElementById('fc-notes-container')) document.getElementById('fc-notes-container').style.display = 'none';
        state.currentTarget = null;
    }
    document.getElementById('fc-counter').innerText = `${state.studyIndex + 1} / ${state.phrasesData.length}`;
}

export function nextStudyCard() {
    state.studyIndex++;
    renderStudyCard();
    playStudyAudio();
}

export function prevStudyCard() {
    state.studyIndex--;
    renderStudyCard();
    playStudyAudio();
}

export function playStudyAudio(e) {
    if (e) e.stopPropagation();
    if (state.currentTarget) {
        speak(state.currentLevel === "0" ? state.currentTarget.pl + " jak " + state.currentTarget.word : state.currentTarget.pl);
    }
}

// Mobile Swipe logic for Flashcards
let touchstartX = 0;
let touchendX = 0;
const flashcardEl = document.getElementById('study-flashcard');

if (flashcardEl) {
    flashcardEl.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, { passive: true });

    flashcardEl.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        if (touchendX < touchstartX - 50) nextStudyCard();
        if (touchendX > touchstartX + 50) prevStudyCard();
    });
}

// ==========================================
// LIBRARY & LEVEL MANAGEMENT
// ==========================================




export function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('lvl-menu').classList.toggle('show');
}

export async function selectLevel(lvlId) {
    state.currentLevel = lvlId.toString();
    localStorage.setItem('pl_current_level_idx', state.currentLevel);

    document.getElementById('lvl-menu').classList.remove('show');
    document.getElementById('search-results-list').style.display = 'none';

    if (document.getElementById('tab-study').classList.contains('active')) {
        document.getElementById('mastery-map').style.display = 'none';
    } else if (document.getElementById('tab-learning').classList.contains('active')) {
        document.getElementById('mastery-map').style.display = 'grid';
    } else {
        document.getElementById('mastery-map').style.display = (state.currentLevel === "0") ? 'grid' : 'flex';
    }

    document.getElementById('banked-search').value = '';

    // Dynamic reconstruction of Level R when clicked
    if (state.currentLevel === "R") {
        let reviewPhrases = [];
        let reviewSet = new Set();
        state.allPhrasesCache.forEach(p => {
            if (isDueForReview(p) && !reviewSet.has(p.pl)) {
                reviewSet.add(p.pl);
                reviewPhrases.push(p);
            }
        });
        state.phrasesData = reviewPhrases;
    } else {
        const file = state.levelList.find(l => l.id == state.currentLevel);
        state.phrasesData = file ? file.data.phrases : [];
    }

    updateUILanguage();
    state.hardMode = false;
    state.activePool = [];
    state.recentPhrasesQueue = [];

    state.studyIndex = 0;

    refreshActivePool();

    if (document.getElementById('tab-study').classList.contains('active')) {
        renderStudyCard();
    } else {
        updateMap();
        startNewRound();
    }
    updateTabCounts();
    updatePointsUI();
}

// ==========================================
// SEARCH & TRANSLATION
// ==========================================
export function copyToClipboard(text, event) {
    if (event) event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => alert("Copied: " + text));
}

export function handleSearch(queryStr, source = 'settings') {
    const query = typeof queryStr === 'string' ? queryStr.toLowerCase() : document.getElementById('banked-search').value.trim().toLowerCase();
    console.log(`[DEBUG] handleSearch() triggered -> query: '${query}', source: ${source}`);
    const mapArea = document.getElementById('mastery-map');
    const listArea = document.getElementById('search-results-list');
    listArea.innerHTML = '';

    if (!query) {
        if (source === 'banked') {
            mapArea.style.display = (state.currentLevel === "0") ? 'grid' : 'flex';
            updateMap(); // Restore all tiles if Banked search is cleared
        } else if (document.getElementById('tab-learning').classList.contains('active')) {
            mapArea.style.display = 'grid';
        }
        listArea.style.display = 'none';
        return;
    }

    mapArea.style.display = 'none';
    document.getElementById('study-view').style.display = 'none';
    listArea.style.display = 'flex';

    const matches = state.allPhrasesCache.filter(p => p.pl.toLowerCase().includes(query) || p.en.toLowerCase().includes(query)).slice(0, 10);

    if (matches.length > 0) {
        matches.forEach(p => {
            const item = document.createElement('div');
            item.className = 'global-result-item';
            item.innerHTML = `
                    <div style="flex:1;">
                        <b>${p.pl}</b><br><small>${p.en}</small>
                    </div>
                    <div style="text-align:right; display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.7rem; color:var(--pol-red); font-weight:bold;">LVL ${p.lvl}</span>
                        <button class="copy-btn-search" onclick="copyToClipboard('${p.pl.replace(/'/g, "\\'")}', event)">📋</button>
                    </div>`;
            item.onclick = () => { selectLevel(p.lvl); };
            listArea.appendChild(item);
        });
    } else {
        const prompt = document.createElement('div');
        prompt.className = 'translate-prompt';
        prompt.innerHTML = `
                <div style="font-size:0.9rem; color:#666; margin-bottom:5px;">Not found.</div>
                <b>"${query}"</b><br>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
                    <button class="btn-translate" id="btn-trans-en" onclick="translateAndAdd('${query}', 'en|pl')">🌐 EN ➔ PL</button>
                    <button class="btn-translate" id="btn-trans-pl" style="background:#3498db;" onclick="translateAndAdd('${query}', 'pl|en')">🌐 PL ➔ EN</button>
                </div>`;
        listArea.appendChild(prompt);
    }
}

export async function translateAndAdd(text, langpair) {
    const btn1 = document.getElementById('btn-trans-en');
    const btn2 = document.getElementById('btn-trans-pl');

    if (btn1) btn1.disabled = true;
    if (btn2) btn2.disabled = true;

    let activeBtn = langpair === 'en|pl' ? btn1 : btn2;

    if (activeBtn) activeBtn.innerText = "Translating...";

    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`);
        const data = await res.json();
        let translated = data.responseData.translatedText;

        let plText = langpair === 'en|pl' ? translated : text;
        let enText = langpair === 'en|pl' ? text : translated;

        state.customPhrases.phrases.push({
            id: "cust_" + Date.now(),
            pl: plText,
            en: enText,
            category: "Custom"
        });

        localStorage.setItem('pl_custom_level', JSON.stringify(state.customPhrases));

        const customList = state.levelList.find(l => l.id === "C");
        if (customList) customList.data = state.customPhrases;

        cacheAllPhrases();

        if (activeBtn) activeBtn.innerText = `✅ Added: ${translated}`;
        setTimeout(() => {
            const searchBar = document.getElementById('banked-search');
            if (searchBar) searchBar.value = '';

            const bankedSearch = document.getElementById('banked-search');
            if (bankedSearch) bankedSearch.value = '';

            handleSearch('', 'settings');
        }, 3000);

        if (state.currentLevel === "C") {
            state.phrasesData = state.customPhrases.phrases;
            refreshActivePool();
            updateMap();
            updateTabCounts();
        }
    } catch (e) {
        if (activeBtn) activeBtn.innerText = "❌ Error";
        if (btn1) btn1.disabled = false;
        if (btn2) btn2.disabled = false;
    }
}

export function saveCurrentToCustom() {
    if (!state.currentTarget) return;

    const btn1 = document.getElementById('header-save-btn');
    const btn2 = document.getElementById('study-save-btn');

    // Check if it already exists to prevent duplicate spam
    const exists = state.customPhrases.phrases.some(p => p.pl === state.currentTarget.pl);

    if (exists) {
        if (btn1) {
            const original = btn1.innerText;
            btn1.innerText = "✅";
            setTimeout(() => btn1.innerText = "⭐", 1500);
        }
        if (btn2) {
            btn2.innerText = "✅";
            setTimeout(() => btn2.innerText = "⭐", 1500);
        }
        return;
    }

    state.customPhrases.phrases.push({
        id: state.currentTarget.id || "cust_" + Date.now(),
        pl: state.currentTarget.pl,
        en: state.currentTarget.en,
        category: state.currentTarget.category || "Saved",
        emoji: state.currentTarget.emoji || "",
        note: state.currentTarget.note || ""
    });

    localStorage.setItem('pl_custom_level', JSON.stringify(state.customPhrases));

    // Update the cache if we are currently viewing the custom level (though less likely in practice, still good)
    const customList = state.levelList.find(l => l.id === "C");
    if (customList) customList.data = state.customPhrases;
    cacheAllPhrases();

    if (btn1) {
        btn1.innerText = "✅";
        setTimeout(() => btn1.innerText = "⭐", 1500);
    }
    if (btn2) {
        btn2.innerText = "✅";
        setTimeout(() => btn2.innerText = "⭐", 1500);
    }
}



// ==========================================
// GAMEPLAY LOGIC & GRIDS (SRS Phase 3)
// ==========================================


export function toggleContentSwap() {
    state.isSwapped = !state.isSwapped;
    updateMap();
    updateQuestionText();
    if (document.getElementById('tab-study').classList.contains('active')) {
        renderStudyCard();
    }
}

export function updateQuestionText() {
    if (!state.currentTarget) return;
    document.getElementById('q-text').innerText = state.hardMode ? "👂 Listen..." : (state.isSwapped ? state.currentTarget.pl : state.currentTarget.en);

    state.currentPlaybackSpeed = 1.0;
    // lbl-btn-listen automatically handled via static translated string
}





export function updatePointsUI() {
    const pd = document.getElementById('points-display');
    pd.innerHTML = `⭐ Points: ${state.userData.totalPoints} | Goal: ${state.userData.dailyPoints} / 1000 | 🔥 Daily: ${state.userData.dailyStreak || 0} | 🎯 Correct: ${state.correctStreak}`;

    if (state.userData.dailyPoints >= 1000) {
        pd.classList.add('points-gold');
    } else {
        pd.classList.remove('points-gold');
    }
}

export function fireConfetti(streak) {
    let defaults = { origin: { y: 0.7 }, zIndex: 5000 };
    if (streak >= 70) confetti({ ...defaults, particleCount: 250, spread: 120, colors: ['#ffd700', '#ff0000', '#ffffff'] });
    else if (streak >= 50) confetti({ ...defaults, particleCount: 150, spread: 90 });
    else if (streak >= 25) confetti({ ...defaults, particleCount: 100, spread: 70 });
    else confetti({ ...defaults, particleCount: 50, spread: 50 });
}

// Phase 3: SRS Logic inside Check Answer
export let headerHideTimeout = null;
export function showMobileHeaderTemp() {
    // Deprecated: Brand Header and Auto-hide removed in V17 UI Redesign
}

export function switchMode(m) {
    showMobileHeaderTemp();

    let tabEl = document.getElementById('tab-' + m);
    if (tabEl && tabEl.classList.contains('active')) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    if (m === 'learning') {
        document.body.classList.add('practice-mode-active');
    } else {
        document.body.classList.remove('practice-mode-active');
    }

    const quizUi = document.getElementById('quiz-ui');
    const map = document.getElementById('mastery-map');
    const studyView = document.getElementById('study-view');
    const searchList = document.getElementById('search-results-list');
    const progWrapper = document.getElementById('prog-wrapper');

    searchList.style.display = 'none';
    const phrasesHeader = document.getElementById('phrases-header');
    if (phrasesHeader) phrasesHeader.style.display = (m === 'mastered') ? 'flex' : 'none';

    if (m === 'study') {
        quizUi.style.display = 'none';
        map.style.display = 'none';
        progWrapper.style.display = 'none';
        studyView.style.display = 'flex';
        clearInterval(state.roundTimer);
        renderStudyCard();
    } else {
        studyView.style.display = 'none';
        progWrapper.style.display = 'block';
        quizUi.style.display = (m === 'learning') ? 'flex' : 'none';

        if (m === 'mastered' && state.currentLevel !== "0") {
            map.style.display = 'flex';
        } else {
            map.style.display = 'grid';
        }

        updateMap();

        if (m === 'learning') {
            startNewRound();
        } else {
            clearInterval(state.roundTimer);
        }
    }
}

export function updateMap() {
    const area = document.getElementById('mastery-map');
    area.innerHTML = '';

    const isPractice = document.getElementById('tab-learning').classList.contains('active');

    if (!isPractice && state.currentLevel !== "0") {
        area.className = 'phrase-list';
    } else {
        area.className = (state.currentLevel === "0") ? 'grid lvl0' : 'grid';
    }
    let validPool = isPractice ? state.activePool.filter(p => p !== null) : [];

    if (isPractice && validPool.length === 0 && document.getElementById('banked-search').value === "") {
        const notice = document.createElement('div');
        notice.className = 'review-notice';
        if (state.currentLevel === "R") {
            notice.innerHTML = `
                    <h3>${t("reviewComplete")}</h3>
                    <p>${t("reviewCompleteText")}</p>
                    <button onclick="selectLevel('1')" style="padding:10px 20px; background:var(--pol-red); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; margin-top:10px;">${t("backToStart")}</button>
                `;
        } else {
            notice.innerHTML = `
                    <h3>${t("masteredTitle")}</h3>
                    <p>${t("masteredText")}</p>
                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:15px;">
                        <button onclick="resetLevelMastery(false)" style="padding:10px; background:var(--pol-red); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">${t("repeatLevel")}</button>
                        <button onclick="resetLevelMastery(true)" style="padding:10px; background:#333; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">${t("repeatHard")}</button>
                    </div>
                `;
        }
        area.appendChild(notice);
        return;
    }

    let list = [];
    if (isPractice) {
        list = state.activePool;
    } else {
        // Phrases Tab: Show ALL phrases for the level, not just mastered ones
        list = state.phrasesData;

        // Apply Phrasebook search filter
        const query = document.getElementById('banked-search') ? document.getElementById('banked-search').value.trim().toLowerCase() : "";
        if (query) {
            list = list.filter(p => !p || p.pl.toLowerCase().includes(query) || p.en.toLowerCase().includes(query));
        }
    }

    console.log('FRAZY Data Length:', state.phrasesData.length);

    console.log(`[DEBUG] updateMap() execution -> isPractice: ${isPractice}, list.length: ${list ? list.length : 'undefined'}, area.style.display: ${area.style.display}, area.className: ${area.className}`);

    list.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';

        if (!p) {
            tile.style.background = 'transparent';
            tile.style.boxShadow = 'none';
            tile.style.cursor = 'default';
            area.appendChild(tile);
            return;
        }

        if (state.currentLevel === "0") {
            const fallbackEmoji = p.emoji || p.e || '';
            tile.innerHTML = `<div class="lvl0-content"><div class="lvl0-big">${p.pl}</div><div class="lvl0-sub">${p.en}</div><div class="lvl0-emoji">${fallbackEmoji}</div></div>`;
        } else if (!isPractice) {
            const plText = getGenderText(p);
            const enText = p.en;
            const emoji = p.emoji || p.e || '';
            const grammarNotes = [p.note, p.grammar_1, p.grammar_2, p.grammar_3].filter(Boolean);
            const notesHtml = grammarNotes.length
                ? `<div style="display:flex; flex-direction:column; gap:3px; font-size:0.7em; color:var(--pol-red); text-align:right; max-width:90px; flex-shrink:0;">${grammarNotes.map(n => `<span>${n}</span>`).join('')}</div>`
                : '';

            tile.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px; width:100%;">
                            <div style="flex:1; min-width:0;">
                                ${emoji ? `<div style="font-size:1.4rem; margin-bottom:4px;">${emoji}</div>` : ''}
                                <div style="font-weight:bold; margin-bottom:3px; font-size:1.05em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${plText}</div>
                                <div style="font-size:0.8em; opacity:0.75; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${enText}</div>
                            </div>
                            ${notesHtml}
                        </div>
                    `;
        } else {
            const targetText = state.isSwapped ? p.en : getGenderText(p);
            const emoji = p.emoji || p.e || '';

            tile.innerHTML = `
                        ${emoji ? `<div style="font-size: 1.5rem; margin-bottom: 5px;">${emoji}</div>` : ''}
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 1.1em;">${targetText}</div>
                    `;
        }

        const score = state.stats[p.pl] ? state.stats[p.pl].score : 0;

        if (isPractice) {
            if (score < 0) {
                let intensity = score === -1 ? 0.6 : 0.95;
                tile.style.backgroundColor = `rgba(52, 152, 219, ${intensity})`;
                tile.style.color = "white";
            } else if (score > 0) {
                let targetHit = state.currentLevel === "R" ? !isDueForReview(p) : score >= THRESHOLD;
                if (targetHit) {
                    tile.style.backgroundColor = 'var(--card)';
                    tile.classList.add('mastered-border');
                } else {
                    tile.style.backgroundColor = `rgba(220, 20, 60, ${score / THRESHOLD})`;
                }
            }
        } else {
            // Phrases List Mode: Show borders and badges for tracked words
            if (score >= THRESHOLD) {
                tile.classList.add('mastered-border');
                tile.style.border = '2px solid var(--gold)';
            }
            if (score > 0) {
                tile.innerHTML += `<div style="position: absolute; top: -8px; right: -8px; background: var(--pol-red); color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; border: 2px solid var(--bg); z-index: 10;">${score}</div>`;
            } else if (score < 0) {
                tile.innerHTML += `<div style="position: absolute; top: -8px; right: -8px; background: #3498db; color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; border: 2px solid var(--bg); z-index: 10;">Needs Work</div>`;
            }
            if (state.currentLevel !== "R" && isDueForReview(p)) {
                tile.innerHTML += `<div style="position: absolute; top: -8px; left: -8px; background: var(--gold); color: black; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; border: 2px solid var(--bg); z-index: 10;">Due</div>`;
            }
        }

        tile.onclick = () => isPractice ? checkAnswer(p, tile) : speak(state.currentLevel === "0" ? p.pl + " jak " + p.word : p.pl);
        area.appendChild(tile);
    });

    console.log(`[DEBUG] updateMap() finished. area.children.length is now: ${area.children.length}`);

    if (state.phrasesData.length) {
        let mCount = 0;
        if (state.currentLevel === "R") {
            mCount = state.phrasesData.filter(p => !isDueForReview(p)).length;
        } else {
            mCount = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) >= THRESHOLD).length;
        }
        document.getElementById('progress-bar').style.width = (mCount / state.phrasesData.length) * 100 + "%";
    }
}

export function updateTabCounts() {
    if (!state.phrasesData.length) return;
    let m = 0;

    if (state.currentLevel === "R") {
        m = state.phrasesData.filter(p => !isDueForReview(p)).length;
    } else {
        m = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) >= THRESHOLD).length;
    }

    if (document.getElementById('learning-count')) {
        document.getElementById('learning-count').innerText = `(${state.phrasesData.length - m})`;
    }
    if (document.getElementById('banked-count')) {
        document.getElementById('banked-count').innerText = `(${m})`;
    }
}

export let listenTapCount = 0;
export let listenTapTimeout = null;

export function handleSpeakerTap() {
    if (state.currentTarget) {
        listenTapCount++;

        let speed = 1.0;
        if (listenTapCount === 2) speed = 0.5;
        if (listenTapCount >= 3) speed = 0.25;

        speak(state.currentLevel === "0" ? state.currentTarget.pl + " jak " + state.currentTarget.word : state.currentTarget.pl, speed);

        clearTimeout(listenTapTimeout);
        listenTapTimeout = setTimeout(() => {
            listenTapCount = 0;
        }, 400); // 400ms window to register consecutive taps
    }
}




export function togglePauseAudio() {
    let icon = document.getElementById('pause-icon');
    let gameArea = document.getElementById('game-area');
    let pauseOverlay = document.getElementById('pause-overlay');

    if (state.isGamePaused) {
        // UNPAUSE
        state.isGamePaused = false;
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            state.isAudioPaused = false;
        }
        if (icon) icon.innerText = '⏸️';
        if (gameArea) gameArea.classList.remove('game-paused');
        if (pauseOverlay) pauseOverlay.style.display = 'none';
    } else {
        // PAUSE
        state.isGamePaused = true;
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            state.isAudioPaused = true;
        }
        if (icon) icon.innerText = '▶️';
        if (gameArea) gameArea.classList.add('game-paused');
        if (pauseOverlay) pauseOverlay.style.display = 'flex';
    }
}

export function toggleStudyNotes() {
    state.studyNotesVisible = !state.studyNotesVisible;
    let notesContainer = document.getElementById('fc-notes-container');
    if (notesContainer && notesContainer.innerHTML) {
        notesContainer.style.display = state.studyNotesVisible ? 'block' : 'none';
    }
}







// ==========================================
// HANDS FREE
// ==========================================
export let hfActive = false, hfIndex = 0, hfPhrases = [], hfPauseDur = 3000, hfAbort = false, hfIsPaused = false;

export function setPauseDuration(sec) {
    hfPauseDur = sec * 1000;
    document.querySelectorAll('.pause-option').forEach(o => o.classList.remove('active'));
    event.target.classList.add('active');
}

export async function openHandsFree() {
    document.getElementById('settings-overlay').style.display = 'none';
    hfActive = true;
    hfAbort = false;
    hfIsPaused = false;
    initAudioContext();
    clearInterval(state.roundTimer);

    hfPhrases = state.phrasesData;
    hfIndex = 0;

    document.getElementById('hf-overlay').style.display = 'flex';
    document.getElementById('hf-level-indicator').innerText = document.getElementById('lvl-current').innerText;

    // Start background microphone listening
    toggleMic(true);

    runHandsFreeLoop();
}

export function closeHandsFree() {
    hfActive = false;
    hfAbort = true;
    window.speechSynthesis.cancel();
    document.getElementById('hf-overlay').style.display = 'none';

    // Stop microphone
    if (isListening) toggleMic();

    if (document.getElementById('tab-learning').classList.contains('active')) {
        startNewRound();
    }
}

export function handleHandsFreeCommand(transcript) {
    if (!hfActive) return;
    console.log("HF COMMAND HEARD: ", transcript);

    if (transcript.includes("stop") || transcript.includes("pauza") || transcript.includes("zatrzymaj")) {
        if (!hfIsPaused) togglePlayPauseHF();
    } else if (transcript.includes("play") || transcript.includes("graj") || transcript.includes("start") || transcript.includes("resume")) {
        if (hfIsPaused) togglePlayPauseHF();
    } else if (transcript.includes("next") || transcript.includes("dalej") || transcript.includes("następny")) {
        skipPhraseHF(1);
    } else if (transcript.includes("back") || transcript.includes("wstecz") || transcript.includes("poprzedni")) {
        skipPhraseHF(-1);
    } else if (transcript.includes("repeat") || transcript.includes("powtórz") || transcript.includes("jeszcze raz")) {
        // If we are at the end-of-level prompt, handle this specially. Otherwise, repeat current.
        if (hfIndex >= hfPhrases.length) {
            hfIndex = 0;
            runHandsFreeLoop();
        } else {
            skipPhraseHF(0);
        }
    }
}

export function togglePlayPauseHF() {
    if (hfIsPaused) {
        hfIsPaused = false;
        document.getElementById('hf-pp-btn').innerText = "⏸ Pause";
        runHandsFreeLoop();
    } else {
        hfIsPaused = true;
        hfAbort = true;
        window.speechSynthesis.cancel();
        document.getElementById('hf-pp-btn').innerText = "▶ Resume";
    }
}

export function skipPhraseHF(offset = 1) {
    hfAbort = true;
    setTimeout(() => {
        hfAbort = false;
        hfIndex += offset;
        if (hfIndex < 0) hfIndex = 0;

        // Check if we skipped out of bounds
        if (hfIndex >= hfPhrases.length) {
            runHandsFreeLoop();
        } else if (!hfIsPaused) {
            runHandsFreeLoop();
        } else {
            // Unpause and run
            togglePlayPauseHF();
        }
    }, 100);
}

export let hfAwaitingResponse = false;
export async function runHandsFreeLoop() {
    hfAbort = false;
    while (hfActive && !hfIsPaused && hfIndex < hfPhrases.length) {
        const p = hfPhrases[hfIndex];
        document.getElementById('hf-emoji').innerText = p.emoji || p.e || '';
        document.getElementById('hf-pl').innerText = p.pl;
        document.getElementById('hf-en').innerText = p.en;
        document.getElementById('hf-counter').innerText = `${hfIndex + 1} / ${hfPhrases.length}`;
        document.getElementById('hf-bar').style.width = ((hfIndex / hfPhrases.length) * 100) + "%";

        let plText = state.currentLevel === "0" ? p.pl + " jak " + p.word : getGenderText(p);

        await speakAsync(plText, 1.0);
        if (hfAbort) break;
        await sleep(hfPauseDur);
        if (hfAbort) break;

        await speakAsync(p.en, 1.0, 'en-US');
        if (hfAbort) break;
        await sleep(hfPauseDur);
        if (hfAbort) break;

        await speakAsync(plText, 0.5);
        if (hfAbort) break;
        await sleep(hfPauseDur);
        if (hfAbort) break;

        await speakAsync(plText, 1.0);
        if (hfAbort) break;
        await sleep(1000);
        if (hfAbort) break;

        hfIndex++;
    }

    if (hfIndex >= hfPhrases.length && !hfIsPaused && !hfAbort && !hfAwaitingResponse) {
        hfAwaitingResponse = true;
        playSuccess();

        // Wait briefly for sound to play
        await sleep(1000);

        const lang = state.uiLang === 'pl' ? 'pl-PL' : 'en-US';
        const msg = state.uiLang === 'pl'
            ? "Poziom ukończony. Powtórzyć, czy następny poziom? Masz 5 sekund."
            : "Level complete. Repeat or next level? You have 5 seconds.";

        await speakAsync(msg, 1.0, lang);

        // Wait for max 5 seconds for handleHandsFreeCommand to intercept a "repeat"
        let waited = 0;
        while (waited < 50 && hfAwaitingResponse && hfActive && !hfIsPaused) {
            // If handlingCommand reset hfIndex to 0 (repeat case), break wait
            if (hfIndex === 0) {
                hfAwaitingResponse = false;
                return;
            }
            await sleep(100);
            waited++;
        }

        // If still waiting after 5s without pausing/aborting, auto-advance
        if (hfAwaitingResponse && hfActive && !hfIsPaused && !hfAbort) {
            hfAwaitingResponse = false;

            // Move to next logical level (excluding custom/R for simplicity out of box, just find next numeric)
            const currentIndex = state.levelList.findIndex(l => l.id === state.currentLevel);
            let nextValidLevel = null;

            if (currentIndex >= 0 && currentIndex < state.levelList.length - 1) {
                nextValidLevel = state.levelList[currentIndex + 1].id;
            }

            if (nextValidLevel && nextValidLevel !== "R" && nextValidLevel !== "C") {
                let loadingMsg = state.uiLang === 'pl' ? "Wczytuję następny poziom." : "Loading next level.";
                await speakAsync(loadingMsg, 1.0, lang);
                await selectLevel(nextValidLevel);
                // Handled safely by openHandsFree which resets everything
                openHandsFree();
            } else {
                let doneMsg = state.uiLang === 'pl' ? "Koniec poziomów." : "End of levels.";
                await speakAsync(doneMsg, 1.0, lang);
                closeHandsFree();
            }
        }
    }
}

export function speakAsync(text, rate = 1.0, lang = 'pl-PL') {
    return new Promise(resolve => {
        if (hfAbort || hfIsPaused) {
            resolve();
            return;
        }
        initAudioContext();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        speechSynthesis.speak(u);
    });
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// INITIALIZATION & SERVICE WORKER
// ==========================================
document.addEventListener('click', initAudioContext, { once: true });
document.addEventListener('touchstart', initAudioContext, { once: true });

window.onload = async () => {
    initSpeech();
    initSpeechRecognition();
    addPoints(0);
    updateUILanguage();
    await scanLibrary();
    await selectLevel(state.currentLevel);
    switchMode('study');
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
    });
}


