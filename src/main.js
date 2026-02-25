import { state, getNextInterval, isDueForReview, THRESHOLD, MIN_SCORE, TIME_SLOW, TIME_DISTRACTED } from './state.js';

// ==========================================
// TRANSLATIONS
// ==========================================
const translations = {
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
        hf: "Hands-Free Mode"
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
        uiPrefix: "Język",
        hard: "Trudny",
        hf: "Tryb Bez Rąk"
    }
};

function t(key) {
    return translations[state.uiLang][key] || key;
}

// ==========================================
// UI UPDATES & MODALS
// ==========================================
function updateUILanguage() {
    if (document.getElementById('app-title')) {
        document.getElementById('app-title').innerText = t('title');
    }
    if (document.getElementById('search-bar')) {
        document.getElementById('search-bar').placeholder = t('search');
    }
    if (document.getElementById('lbl-ui-lang-label')) {
        document.getElementById('lbl-ui-lang-label').innerText = t('uiPrefix');
    }
    if (document.getElementById('lbl-ui-lang')) {
        document.getElementById('lbl-ui-lang').innerText = state.uiLang.toUpperCase();
    }

    if (document.getElementById('lbl-hf')) {
        document.getElementById('lbl-hf').innerHTML = `🎧 Start ${t('hf')}`;
    }

    if (document.getElementById('btn-save')) {
        document.getElementById('btn-save').innerText = t('save');
    }

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

function toggleUILang() {
    state.uiLang = state.uiLang === 'en' ? 'pl' : 'en';
    localStorage.setItem('polishMasterUILang', state.uiLang);
    updateUILanguage();
}

function toggleHelp() {
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

function toggleSettings() {
    const el = document.getElementById('settings-overlay');
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
}

// Phase 2: Grammar Hint Controls
function showHint() {
    if (!state.currentTarget || !state.currentTarget.note) return;
    state.isTimerPaused = true;
    document.getElementById('hint-text').innerText = state.currentTarget.note;
    document.getElementById('hint-overlay').style.display = 'flex';
}

function closeHint() {
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

function getGenderText(p) {
    return p.pl;
}

// ==========================================
// STUDY MODE (FLASHCARDS)
// ==========================================
function renderStudyCard() {
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

function nextStudyCard() {
    state.studyIndex++;
    renderStudyCard();
    playStudyAudio();
}

function prevStudyCard() {
    state.studyIndex--;
    renderStudyCard();
    playStudyAudio();
}

function playStudyAudio(e) {
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
// AUDIO & SYNTHESIS
// ==========================================
function initAudioContext() {
    if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }

    if (!state.audioKeepAliveInterval) {
        state.audioKeepAliveInterval = setInterval(() => {
            if (state.audioCtx && state.audioCtx.state === 'suspended') {
                state.audioCtx.resume();
            }
            try {
                const o = state.audioCtx.createOscillator();
                const g = state.audioCtx.createGain();
                g.gain.value = 0.001;
                o.connect(g);
                g.connect(state.audioCtx.destination);
                o.start();
                o.stop(state.audioCtx.currentTime + 0.01);
            } catch (e) { }
        }, 20000);
    }
}

function playNote(freq, dur, type = 'sine') {
    initAudioContext();
    try {
        const now = state.audioCtx.currentTime;
        const o = state.audioCtx.createOscillator();
        const g = state.audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + dur);
        o.connect(g);
        g.connect(state.audioCtx.destination);
        o.start();
        o.stop(now + dur);
    } catch (e) { }
}

function playWrongSlide() {
    initAudioContext();
    try {
        const now = state.audioCtx.currentTime;
        const o = state.audioCtx.createOscillator();
        const g = state.audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, now);
        o.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        o.connect(g);
        g.connect(state.audioCtx.destination);
        o.start();
        o.stop(now + 0.4);
    } catch (e) { }
}

function playSuccess() {
    playNote(523, 0.2, 'triangle');
    setTimeout(() => playNote(659, 0.2, 'triangle'), 100);
    setTimeout(() => playNote(783, 0.4, 'triangle'), 200);
}

function initSpeech() {
    state.plVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('pl'));
}

function speak(t, rate = 1.0, onEndCallback = null) {
    initAudioContext();
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    if (state.plVoice) m.voice = state.plVoice;
    m.lang = 'pl-PL';
    m.rate = rate;

    if (onEndCallback) {
        let callbackFired = false;
        const safeCallback = () => {
            if (!callbackFired) {
                callbackFired = true;
                onEndCallback();
            }
        };
        m.onend = safeCallback;
        m.onerror = safeCallback;
        // Fallback timeout in case the Web Speech API drops the ends event
        setTimeout(safeCallback, 4000);
    }

    window.speechSynthesis.speak(m);
}

// ==========================================
// VOICE RECOGNITION (MIC)
// ==========================================
let recognition;
let isListening = false;

function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            document.getElementById('mic-btn').classList.add('mic-active');
            document.getElementById('feedback').innerText = "Listening... 🎤";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            checkSpokenAnswer(transcript);
        };

        recognition.onerror = () => {
            document.getElementById('feedback').innerText = "Mic error / nothing heard.";
            document.getElementById('feedback').style.color = "var(--pol-red)";
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };
    }
}

function toggleMic() {
    if (!recognition) {
        alert("Voice recognition not supported in this browser. Please use Chrome or Safari over HTTPS.");
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        recognition.lang = state.isSwapped ? 'en-US' : 'pl-PL';
        recognition.start();
    }
}

function stopListening() {
    isListening = false;
    document.getElementById('mic-btn').classList.remove('mic-active');
}

function cleanStr(str) {
    return str ? str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim() : "";
}

function checkSpokenAnswer(transcript) {
    if (!state.currentTarget) return;

    const expected = state.isSwapped ? state.currentTarget.en : state.currentTarget.pl;
    const eClean = cleanStr(expected);
    const tClean = cleanStr(transcript);

    let match = (tClean === eClean);

    if (state.currentLevel === "0" && cleanStr(state.currentTarget.word) === tClean) {
        match = true;
    }

    if (!state.isSwapped && state.currentTarget.variants) {
        if (cleanStr(state.currentTarget.variants.m) === tClean || cleanStr(state.currentTarget.variants.f) === tClean) {
            match = true;
        }
    }

    // Handle Mic in Study Mode without saving points
    if (document.getElementById('tab-study').classList.contains('active')) {
        if (match) {
            document.getElementById('fc-pl').style.color = "var(--success-green)";
            playSuccess();
            setTimeout(() => {
                document.getElementById('fc-pl').style.color = "var(--pol-red)";
                nextStudyCard();
            }, 1500);
        } else {
            playWrongSlide();
        }
        return;
    }

    if (match) {
        let targetTile = Array.from(document.querySelectorAll('.tile')).find(t =>
            cleanStr(t.innerText) === eClean ||
            (state.currentLevel === "0" && t.innerHTML.toLowerCase().includes(tClean)) ||
            (state.currentTarget.variants && (cleanStr(t.innerText) === cleanStr(state.currentTarget.variants.m) || cleanStr(t.innerText) === cleanStr(state.currentTarget.variants.f)))
        );

        if (!targetTile) targetTile = document.createElement('div');

        checkAnswer(state.currentTarget, targetTile);
    } else {
        document.getElementById('feedback').innerText = `Heard: "${transcript}" ❌`;
        document.getElementById('feedback').style.color = "var(--pol-red)";

        state.correctStreak = 0;
        state.basePitch = 220;
        addPoints(-5);
        playWrongSlide();

        // Phase 3: SRS Penalty logic applied manually to Voice Rec failure
        let cStat = state.stats[state.currentTarget.pl] || { score: 0, interval: 0, nextReview: 0 };
        if (cStat.score >= THRESHOLD) {
            cStat.score = -1; // Heavy penalty for forgetting
            cStat.interval = 0;
            cStat.nextReview = 0;
        } else {
            cStat.score = Math.max(MIN_SCORE, cStat.score - 1);
        }
        state.stats[state.currentTarget.pl] = cStat;

        localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
        updateMap();
    }
}

// ==========================================
// LIBRARY & LEVEL MANAGEMENT
// ==========================================
async function scanLibrary() {
    const menu = document.getElementById('lvl-menu');
    menu.innerHTML = '';
    state.levelList = [];

    let consecutiveEmptyMajors = 0;
    const MAX_CONSECUTIVE_EMPTY_MAJORS = 3;
    const MAX_CONSECUTIVE_EMPTY_MINORS = 2;

    for (let major = 0; major <= 100; major++) {
        let majorFound = false;
        try {
            const r = await fetch(`phrases_${major}.json`, { cache: 'no-store' });
            if (r.ok) {
                const data = await r.json();
                state.levelList.push({ id: major.toString(), desc: data.description || `Level ${major}`, data: data });
                majorFound = true;
                consecutiveEmptyMajors = 0;
            } else {
                consecutiveEmptyMajors++;
            }
        } catch (e) {
            consecutiveEmptyMajors++;
        }

        if (majorFound) {
            let consecutiveEmptyMinors = 0;
            for (let minor = 1; minor <= 20; minor++) {
                let minorId = `${major}.${minor}`;
                try {
                    const rMinor = await fetch(`phrases_${minorId}.json`, { cache: 'no-store' });
                    if (rMinor.ok) {
                        const dataMinor = await rMinor.json();
                        state.levelList.push({ id: minorId, desc: dataMinor.description || `Level ${minorId}`, data: dataMinor });
                        consecutiveEmptyMinors = 0;
                    } else {
                        consecutiveEmptyMinors++;
                    }
                } catch (e) {
                    consecutiveEmptyMinors++;
                }
                if (consecutiveEmptyMinors >= MAX_CONSECUTIVE_EMPTY_MINORS) break;
            }
        }
        if (consecutiveEmptyMajors >= MAX_CONSECUTIVE_EMPTY_MAJORS) break;
    }

    state.levelList.push({ id: "C", desc: state.customPhrases.description, data: state.customPhrases });
    cacheAllPhrases();

    // Phase 3: Calculate global Needs Review (Level R) based on Time and Mistakes
    let reviewPhrases = [];
    let reviewSet = new Set();
    state.allPhrasesCache.forEach(p => {
        if (isDueForReview(p) && !reviewSet.has(p.pl)) {
            reviewSet.add(p.pl);
            reviewPhrases.push(p);
        }
    });

    state.levelList.push({
        id: "R",
        desc: t('needsReview'),
        data: { description: t('needsReview'), phrases: reviewPhrases }
    });

    state.levelList.forEach(lvl => {
        let isDone = false;
        if (lvl.id === "R") {
            isDone = lvl.data.phrases.length === 0;
        } else {
            const masteredCount = lvl.data.phrases.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) >= THRESHOLD).length;
            isDone = masteredCount > 0 && masteredCount === lvl.data.phrases.length;
        }

        let repeats = state.userData.levelCompletions[lvl.id] || 0;
        let rBadge = repeats > 0 ? `<span style="color:var(--pol-red); font-size:10px; margin-left:5px;">🔄x${repeats}</span>` : '';

        const item = document.createElement('div');

        if (lvl.id === "R") {
            item.className = 'dropdown-item sandbox';
            item.innerHTML = `<span>Lvl R: ${t('needsReview')} (${lvl.data.phrases.length})</span>`;
        } else {
            item.className = 'dropdown-item' + (isDone ? ' mastered' : '') + (lvl.id === "C" ? ' sandbox' : '');
            item.innerHTML = `<span>Lvl ${lvl.id}: ${lvl.desc}${rBadge}</span>${isDone ? '<span class="check-icon">✅</span>' : ''}`;
        }

        item.onclick = (e) => {
            e.stopPropagation();
            selectLevel(lvl.id);
        };
        menu.appendChild(item);
    });

    if (!state.levelList.find(l => l.id == state.currentLevel)) state.currentLevel = state.levelList[0].id;
    selectLevel(state.currentLevel);
}

async function cacheAllPhrases() {
    state.allPhrasesCache = [];
    state.levelList.forEach(lvl => {
        if (lvl.id !== "R" && lvl.data && lvl.data.phrases) {
            lvl.data.phrases.forEach(p => state.allPhrasesCache.push({ ...p, lvl: lvl.id }));
        }
    });
}

function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('lvl-menu').classList.toggle('show');
}

async function selectLevel(lvlId) {
    state.currentLevel = lvlId.toString();
    localStorage.setItem('pl_current_level_idx', state.currentLevel);

    document.getElementById('lvl-menu').classList.remove('show');
    document.getElementById('search-results-list').style.display = 'none';
    document.getElementById('mastery-map').style.display = 'grid';

    document.getElementById('search-bar').value = '';

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
function copyToClipboard(text, event) {
    if (event) event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => alert("Copied: " + text));
}

function handleSearch() {
    const query = document.getElementById('search-bar').value.trim().toLowerCase();
    const mapArea = document.getElementById('mastery-map');
    const listArea = document.getElementById('search-results-list');
    listArea.innerHTML = '';

    if (!query) {
        if (document.getElementById('tab-learning').classList.contains('active')) {
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

async function translateAndAdd(text, langpair) {
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
            document.getElementById('search-bar').value = '';
            handleSearch();
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

function saveCurrentToCustom() {
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

function exportCustomLevel() {
    const b = new Blob([JSON.stringify(state.customPhrases, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `phrases_C_${Date.now()}.json`;
    a.click();

    setTimeout(() => {
        if (confirm("Download started!\n\nDo you want to wipe your current Sandbox clean to start a new list?")) {
            state.customPhrases.phrases = [];
            localStorage.setItem('pl_custom_level', JSON.stringify(state.customPhrases));
            if (state.currentLevel === "C") selectLevel("C");
        }
    }, 500);
}

// ==========================================
// GAMEPLAY LOGIC & GRIDS (SRS Phase 3)
// ==========================================
function refreshActivePool() {
    if (state.currentLevel === "0") {
        state.activePool = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) < THRESHOLD);
        return;
    }

    if (state.currentLevel === "R") {
        if (state.activePool.length !== 6) {
            state.activePool = new Array(6).fill(null);
        }
        let unmastered = state.phrasesData.filter(p => isDueForReview(p));

        for (let i = 0; i < 6; i++) {
            if (!state.activePool[i] || !isDueForReview(state.activePool[i])) {
                let nextPhrase = unmastered.find(p => !state.activePool.some(ap => ap && ap.pl === p.pl));
                state.activePool[i] = nextPhrase || null;
            }
        }
        return;
    }

    if (state.activePool.length !== 6) {
        state.activePool = new Array(6).fill(null);
    }

    let unmastered = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) < THRESHOLD);

    for (let i = 0; i < 6; i++) {
        if (!state.activePool[i] || (state.stats[state.activePool[i].pl] ? state.stats[state.activePool[i].pl].score : 0) >= THRESHOLD) {
            let nextPhrase = unmastered.find(p => !state.activePool.some(ap => ap && ap.pl === p.pl));
            state.activePool[i] = nextPhrase || null;
        }
    }
}

function toggleContentSwap() {
    state.isSwapped = !state.isSwapped;
    updateMap();
    updateQuestionText();
    if (document.getElementById('tab-study').classList.contains('active')) {
        renderStudyCard();
    }
}

function updateQuestionText() {
    if (!state.currentTarget) return;
    document.getElementById('q-text').innerText = state.hardMode ? "👂 Listen..." : (state.isSwapped ? state.currentTarget.pl : state.currentTarget.en);

    state.currentPlaybackSpeed = 1.0;
    // lbl-btn-listen automatically handled via static translated string
}

function startNewRound() {
    clearInterval(state.roundTimer);
    document.getElementById('timer-bar').style.width = "100%";
    document.getElementById('timer-bar').className = "";

    let validPool = state.activePool.filter(p => p !== null);

    if (!validPool.length) {
        document.getElementById('q-text').innerText = "Done!";
        if (document.getElementById('btn-hint')) document.getElementById('btn-hint').style.display = 'none';
        isAppFrozen = false;
        document.body.classList.remove('app-frozen');
        return;
    }

    let historyLimit = Math.min(3, validPool.length - 1);
    let nextTarget;

    if (validPool.length === 1) {
        nextTarget = validPool[0];
    } else {
        do {
            nextTarget = validPool[Math.floor(Math.random() * validPool.length)];
        } while (historyLimit > 0 && state.recentPhrasesQueue.includes(nextTarget.pl));
    }

    state.currentTarget = nextTarget;
    state.recentPhrasesQueue.push(state.currentTarget.pl);

    if (state.recentPhrasesQueue.length > 3) {
        state.recentPhrasesQueue.shift();
    }

    updateQuestionText();
    document.getElementById('feedback').innerText = "";
    state.questionStartTime = Date.now();

    state.roundTimer = setInterval(() => {
        // Phase 2: Freeze timer if reading a hint or globally paused
        if (state.isTimerPaused || isGamePaused) {
            state.questionStartTime += 50;
            return;
        }

        let elapsed = Date.now() - state.questionStartTime;
        let pct = Math.max(0, 100 - (elapsed / TIME_DISTRACTED) * 100);
        let tBar = document.getElementById('timer-bar');

        if (tBar) {
            tBar.style.width = pct + "%";
            if (elapsed > TIME_SLOW && elapsed <= 8000) {
                tBar.className = "timer-warning";
            } else if (elapsed > 8000) {
                tBar.className = "timer-danger";
            }
        }
        if (elapsed >= TIME_DISTRACTED) {
            clearInterval(state.roundTimer);
            document.getElementById('feedback').innerText = t('tooSlow');
            document.getElementById('feedback').style.color = "var(--pol-red)";
        }
    }, 50);

    setTimeout(() => {
        let textToSpeak = state.currentLevel === "0" ? state.currentTarget.pl + " jak " + state.currentTarget.word : state.currentTarget.pl;
        speak(textToSpeak, 1.0, () => {
            isAppFrozen = false;
            document.body.classList.remove('app-frozen');
        });
    }, 300);
}

function addPoints(pts) {
    let todayStr = new Date().toDateString();

    if (state.userData.lastPlayDate !== todayStr) {
        if (state.userData.lastPlayDate) {
            let todayTime = new Date(todayStr).getTime();
            let lastPlayTime = new Date(state.userData.lastPlayDate).getTime();
            let daysDiff = Math.abs(Math.round((todayTime - lastPlayTime) / (1000 * 3600 * 24)));

            if (daysDiff === 1) {
                state.userData.dailyStreak = (state.userData.dailyStreak || 0) + 1;
            } else if (daysDiff > 1) {
                state.userData.dailyStreak = 1; // Reset streak if missed more than 1 day
            }
        } else {
            state.userData.dailyStreak = 1; // First time playing
        }
        state.userData.dailyPoints = 0;
        state.userData.lastPlayDate = todayStr;
    }

    let previousPoints = state.userData.dailyPoints;
    state.userData.totalPoints = Math.max(0, state.userData.totalPoints + pts);
    state.userData.dailyPoints = Math.max(0, state.userData.dailyPoints + pts);

    if (state.userData.totalPoints >= 3000 && !state.userData.badges.includes("Novice")) state.userData.badges.push("Novice");
    if (state.userData.totalPoints >= 15000 && !state.userData.badges.includes("Pro")) state.userData.badges.push("Pro");
    if (state.userData.totalPoints >= 30000 && !state.userData.badges.includes("Master")) state.userData.badges.push("Master");
    if (state.userData.totalPoints >= 100000 && !state.userData.badges.includes("Legend")) state.userData.badges.push("Legend");

    if (state.correctStreak > state.userData.bestStreak) state.userData.bestStreak = state.correctStreak;

    // Optionally fire confetti if they hit their daily 1000 point goal.
    if (state.userData.dailyPoints >= 1000 && previousPoints < 1000) {
        if (state.userData.lastGoalDate !== todayStr) {
            // (Removed the arbitrary streak++ here as it's now handled by the consecutive day login)
            state.userData.lastGoalDate = todayStr;
            fireConfetti(100);
        }
    }

    localStorage.setItem('pl_user_data', JSON.stringify(state.userData));
    updatePointsUI();
}

function updatePointsUI() {
    const pd = document.getElementById('points-display');
    pd.innerHTML = `⭐ Points: ${state.userData.totalPoints} | Goal: ${state.userData.dailyPoints} / 1000 | 🔥 Streak: ${state.userData.dailyStreak || 0}`;

    if (state.userData.dailyPoints >= 1000) {
        pd.classList.add('points-gold');
    } else {
        pd.classList.remove('points-gold');
    }
}

function fireConfetti(streak) {
    let defaults = { origin: { y: 0.7 }, zIndex: 5000 };
    if (streak >= 70) confetti({ ...defaults, particleCount: 250, spread: 120, colors: ['#ffd700', '#ff0000', '#ffffff'] });
    else if (streak >= 50) confetti({ ...defaults, particleCount: 150, spread: 90 });
    else if (streak >= 25) confetti({ ...defaults, particleCount: 100, spread: 70 });
    else confetti({ ...defaults, particleCount: 50, spread: 50 });
}

// Phase 3: SRS Logic inside Check Answer
let isAppFrozen = false;

function checkAnswer(phrase, el) {
    if (isAppFrozen) return;
    isAppFrozen = true;
    document.body.classList.add('app-frozen');

    clearInterval(state.roundTimer);
    let timeTaken = Date.now() - state.questionStartTime;
    let isDistracted = timeTaken >= TIME_DISTRACTED;

    // Fetch or create new stat object
    let pStat = state.stats[phrase.pl] || { score: 0, interval: 0, nextReview: 0 };

    if (phrase.pl === state.currentTarget.pl) {
        let pts = 10;
        if (isDistracted) {
            pts = 0;
            state.correctStreak = 0;
            state.basePitch = 220;
            document.getElementById('feedback').innerText = t('correctSlow');
            document.getElementById('feedback').style.color = "var(--gold)";
        } else {
            state.correctStreak++;
            let pitchOffset = (state.correctStreak % 5) * 30;
            playNote(state.basePitch + pitchOffset, 0.15, 'sine');

            if (state.correctStreak > 0 && state.correctStreak % 5 === 0) {
                state.basePitch = Math.min(state.basePitch + 20, 350);
                fireConfetti(state.correctStreak);
            }

            if (timeTaken > TIME_SLOW) pts -= 4;
            document.getElementById('feedback').innerText = t('correct');
            document.getElementById('feedback').style.color = "var(--success-green)";
        }

        addPoints(pts);

        // Phase 3 SRS Upgrades:
        pStat.score++;
        if (pStat.score >= THRESHOLD) {
            // If the word was due for review today, successfully remembering it extends its interval!
            if (pStat.nextReview <= Date.now()) {
                pStat.interval = getNextInterval(pStat.interval);
                // Add slight random offset to review times so they don't pile up on exact milliseconds
                let randomHourOffset = Math.floor(Math.random() * 3600000);
                pStat.nextReview = Date.now() + (pStat.interval * 86400000) + randomHourOffset;
            }
        }
        state.stats[phrase.pl] = pStat;

        if (state.currentLevel === "0") speak(phrase.pl + " jak " + phrase.word);

        setTimeout(() => {
            refreshActivePool();
            updateMap();
            updateTabCounts();

            let validPool = state.activePool.filter(p => p !== null);
            if (validPool.length === 0) {
                playSuccess();
                isAppFrozen = false;
                document.body.classList.remove('app-frozen');
            } else {
                startNewRound();
            }
        }, 600);

    } else {
        state.correctStreak = 0;
        state.basePitch = 220;

        let pts = isDistracted ? 0 : -5;
        addPoints(pts);
        playWrongSlide();

        // Phase 3 SRS Penalty Logic:
        let penalizeWord = (wordPl) => {
            let s = state.stats[wordPl] || { score: 0, interval: 0, nextReview: 0 };
            if (s.score >= THRESHOLD) {
                s.score = -1;
                s.interval = 0;
                s.nextReview = 0;
            } else {
                s.score = Math.max(MIN_SCORE, s.score - 1);
            }
            state.stats[wordPl] = s;
        };

        penalizeWord(state.currentTarget.pl);

        if (el) el.classList.add('wrong');
        document.getElementById('feedback').innerText = t('mistake');
        document.getElementById('feedback').style.color = "var(--pol-red)";

        setTimeout(() => {
            if (el) el.classList.remove('wrong');
            refreshActivePool();
            updateMap();
            startNewRound();
        }, 1000);
    }
    localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
}

function resetLevelMastery(enableHardMode = false) {
    let msg = enableHardMode ? "Reset and practice in Hard Mode (Audio Only)?" : "Are you sure you want to practice this level again?";

    if (confirm(msg)) {
        if (state.currentLevel !== "C" && state.currentLevel !== "R" && state.currentLevel !== "0") {
            state.userData.levelCompletions[state.currentLevel] = (state.userData.levelCompletions[state.currentLevel] || 0) + 1;
            localStorage.setItem('pl_user_data', JSON.stringify(state.userData));
        }

        state.phrasesData.forEach(p => { delete state.stats[p.pl]; });
        saveStats();

        state.hardMode = enableHardMode;
        state.activePool = [];
        refreshActivePool();
        updateMap();
        updateTabCounts();
        startNewRound();
        scanLibrary();
    }
}

function saveStats() {
    localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
    localStorage.setItem('pl_current_level_idx', state.currentLevel);
}

let headerHideTimeout = null;
function showMobileHeaderTemp() {
    // Deprecated: Brand Header and Auto-hide removed in V17 UI Redesign
}

function switchMode(m) {
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
        map.style.display = (state.currentLevel === "0") ? 'grid lvl0' : 'grid';
        updateMap();

        if (m === 'learning') {
            startNewRound();
        } else {
            clearInterval(state.roundTimer);
        }
    }
}

function updateMap() {
    const area = document.getElementById('mastery-map');
    area.innerHTML = '';

    const isPractice = document.getElementById('tab-learning').classList.contains('active');

    if (!isPractice && state.currentLevel !== "0") {
        area.className = 'phrase-list';
    } else {
        area.className = (state.currentLevel === "0") ? 'grid lvl0' : 'grid';
    }
    let validPool = isPractice ? state.activePool.filter(p => p !== null) : [];

    if (isPractice && validPool.length === 0 && document.getElementById('search-bar').value === "") {
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
    }

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

            tile.innerHTML = `
                        ${emoji ? `<div style="font-size: 1.5rem; margin-bottom: 5px;">${emoji}</div>` : ''}
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 1.1em;">${plText}</div>
                        <div style="font-size: 0.8em; opacity: 0.75;">${enText}</div>
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

function updateTabCounts() {
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

let listenTapCount = 0;
let listenTapTimeout = null;

function handleSpeakerTap() {
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

let isAudioPaused = false;
let isGamePaused = false;

function togglePauseAudio() {
    let icon = document.getElementById('pause-icon');
    let gameArea = document.getElementById('game-area');
    let pauseOverlay = document.getElementById('pause-overlay');

    if (isGamePaused) {
        // UNPAUSE
        isGamePaused = false;
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            isAudioPaused = false;
        }
        if (icon) icon.innerText = '⏸️';
        if (gameArea) gameArea.classList.remove('game-paused');
        if (pauseOverlay) pauseOverlay.style.display = 'none';
    } else {
        // PAUSE
        isGamePaused = true;
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            isAudioPaused = true;
        }
        if (icon) icon.innerText = '▶️';
        if (gameArea) gameArea.classList.add('game-paused');
        if (pauseOverlay) pauseOverlay.style.display = 'flex';
    }
}

function toggleStudyNotes() {
    state.studyNotesVisible = !state.studyNotesVisible;
    let notesContainer = document.getElementById('fc-notes-container');
    if (notesContainer && notesContainer.innerHTML) {
        notesContainer.style.display = state.studyNotesVisible ? 'block' : 'none';
    }
}

function downloadProgress() {
    const b = new Blob([JSON.stringify({ stats: state.stats, userData: state.userData })], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `polish_master.txt`;
    a.click();
}

function importProgress(event) {
    const r = new FileReader();
    r.onload = (ev) => {
        const d = JSON.parse(ev.target.result);
        state.stats = d.stats || d;
        state.userData = d.userData || state.userData;

        if (state.userData.dailyStreak === undefined) state.userData.dailyStreak = 0;
        if (state.userData.lastGoalDate === undefined) state.userData.lastGoalDate = null;
        if (!state.userData.levelCompletions) state.userData.levelCompletions = {};

        localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
        localStorage.setItem('pl_user_data', JSON.stringify(state.userData));
        location.reload();
    };
    r.readAsText(event.target.files[0]);
}

function resetEverything() {
    if (confirm("Clear ALL data and restart?")) {
        localStorage.clear();
        location.reload();
    }
}

// ==========================================
// HANDS FREE
// ==========================================
let hfActive = false, hfIndex = 0, hfPhrases = [], hfPauseDur = 3000, hfAbort = false, hfIsPaused = false;

function setPauseDuration(sec) {
    hfPauseDur = sec * 1000;
    document.querySelectorAll('.pause-option').forEach(o => o.classList.remove('active'));
    event.target.classList.add('active');
}

async function openHandsFree() {
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

    runHandsFreeLoop();
}

function closeHandsFree() {
    hfActive = false;
    hfAbort = true;
    window.speechSynthesis.cancel();
    document.getElementById('hf-overlay').style.display = 'none';

    if (document.getElementById('tab-learning').classList.contains('active')) {
        startNewRound();
    }
}

function togglePlayPauseHF() {
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

function skipPhraseHF() {
    hfAbort = true;
    setTimeout(() => {
        hfAbort = false;
        hfIndex++;
        runHandsFreeLoop();
    }, 100);
}

async function runHandsFreeLoop() {
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

    if (hfIndex >= hfPhrases.length && !hfIsPaused && !hfAbort) {
        playSuccess();
        closeHandsFree();
    }
}

function speakAsync(text, rate = 1.0, lang = 'pl-PL') {
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// INITIALIZATION & SERVICE WORKER
// ==========================================
document.addEventListener('click', initAudioContext, { once: true });
document.addEventListener('touchstart', initAudioContext, { once: true });

window.onload = () => {
    initSpeech();
    initSpeechRecognition();
    addPoints(0);
    updateUILanguage();
    scanLibrary();
    switchMode('study');
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .catch(err => console.log('SW fail.', err));
    });
}


// --- MODULE TO GLOBAL BRIDGE ---


// --- MODULE TO GLOBAL BRIDGE ---
window.resetLevelMastery = resetLevelMastery;
window.closeHint = closeHint;
window.startNewRound = startNewRound;
window.sleep = sleep;
window.playSuccess = playSuccess;
window.toggleSettings = toggleSettings;
window.toggleHelp = toggleHelp;
window.renderStudyCard = renderStudyCard;
window.resetEverything = resetEverything;
window.handleSpeakerTap = handleSpeakerTap;
window.importProgress = importProgress;
window.showMobileHeaderTemp = showMobileHeaderTemp;
window.cacheAllPhrases = cacheAllPhrases;
window.toggleContentSwap = toggleContentSwap;
window.updateMap = updateMap;
window.openHandsFree = openHandsFree;
window.updateQuestionText = updateQuestionText;
window.playWrongSlide = playWrongSlide;
window.speakAsync = speakAsync;
window.initSpeechRecognition = initSpeechRecognition;
window.toggleMic = toggleMic;
window.saveCurrentToCustom = saveCurrentToCustom;
window.runHandsFreeLoop = runHandsFreeLoop;
window.downloadProgress = downloadProgress;
window.switchMode = switchMode;
window.playStudyAudio = playStudyAudio;
window.speak = speak;
window.t = t;
window.checkAnswer = checkAnswer;
window.toggleStudyNotes = toggleStudyNotes;
window.scanLibrary = scanLibrary;
window.initSpeech = initSpeech;
window.nextStudyCard = nextStudyCard;
window.refreshActivePool = refreshActivePool;
window.toggleUILang = toggleUILang;
window.exportCustomLevel = exportCustomLevel;
window.playNote = playNote;
window.setPauseDuration = setPauseDuration;
window.checkSpokenAnswer = checkSpokenAnswer;
window.togglePlayPauseHF = togglePlayPauseHF;
window.initAudioContext = initAudioContext;
window.fireConfetti = fireConfetti;
window.skipPhraseHF = skipPhraseHF;
window.toggleDropdown = toggleDropdown;
window.showHint = showHint;
window.updateUILanguage = updateUILanguage;
window.selectLevel = selectLevel;
window.copyToClipboard = copyToClipboard;
window.getGenderText = getGenderText;
window.prevStudyCard = prevStudyCard;
window.closeHandsFree = closeHandsFree;
window.translateAndAdd = translateAndAdd;
window.saveStats = saveStats;
window.togglePauseAudio = togglePauseAudio;
window.stopListening = stopListening;
window.updatePointsUI = updatePointsUI;
window.cleanStr = cleanStr;
window.handleSearch = handleSearch;
window.updateTabCounts = updateTabCounts;
window.addPoints = addPoints;
console.log('Main.js is executing'); console.log('window.toggleSettings is:', typeof window.toggleSettings);
