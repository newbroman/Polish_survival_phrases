/**
 * app_logic.js 
 * FULL ENGINE - All features included.
 */

// 1. PERSISTENCE & SETTINGS
let stats = JSON.parse(localStorage.getItem('pl_stats')) || {};
let currentLevel = parseInt(localStorage.getItem('pl_current_level')) || 0;
let uiLang = localStorage.getItem('pl_ui_lang') || 'EN';
let isSwapped = localStorage.getItem('pl_swap') === 'true';
const THRESHOLD = 5;

// 2. GLOBAL STATE
let globalPhrases = []; 
let phrasesData = [];
let activePool = [];
let visibleItems = []; 
let currentTarget = null;
let streakCounter = 0;
let quizHistory = []; 

// Hands-Free State
let hfActive = false;
let hfPaused = false;
let hfAbort = false;
let hfSkip = false;
let hfDelay = 3000; 

// 3. INITIALIZATION
async function buildGlobalIndex() {
    globalPhrases = [];
    for (let i = 0; i <= 15; i++) {
        try {
            const response = await fetch(`phrases_${i}.json`);
            if (response.ok) {
                const data = await response.json();
                const tagged = data.phrases.map(p => ({ ...p, levelOrigin: i }));
                globalPhrases = globalPhrases.concat(tagged);
            } else { break; }
        } catch (e) { break; }
    }
}

async function init() {
    await buildGlobalIndex(); 
    await populateLevelMenu();
    loadLevel(currentLevel);
    applyUILang();
}

// 4. DATA & LEVEL LOADING
async function populateLevelMenu() {
    const menu = document.getElementById('lvl-menu');
    const trigger = document.getElementById('lvl-current');
    if (!menu || !trigger) return;
    
    menu.innerHTML = '';
    for (let i = 0; i <= 15; i++) {
        try {
            const response = await fetch(`phrases_${i}.json`);
            if (response.ok) {
                const data = await response.json();
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `<span>Level ${i}: ${data.description || 'Phrases'}</span>`;
                item.onclick = (e) => {
                    e.stopPropagation();
                    currentLevel = i;
                    localStorage.setItem('pl_current_level', i);
                    loadLevel(i);
                    toggleDropdown();
                };
                menu.appendChild(item);
                if (i === currentLevel) trigger.innerText = `Level ${i}: ${data.description}`;
            }
        } catch (e) {}
    }
}

async function loadLevel(lvl) {
    try {
        const response = await fetch(`phrases_${lvl}.json`);
        const data = await response.json();
        phrasesData = data.phrases;
        
        // Update Grid Layout
        const area = document.getElementById('mastery-map');
        if (area) {
            area.className = (lvl === 0) ? 'grid-alphabet' : 'grid';
        }
        
        // Update Title
        const trigger = document.getElementById('lvl-current');
        if (trigger) trigger.innerText = `Level ${lvl}: ${data.description}`;

        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
        updateMap();
        nextRound();
    } catch (e) { console.error("Load failed:", e); }
}

// 5. GRID RENDERING
function updateMap(filter = "") {
    const area = document.getElementById('mastery-map');
    const isLearning = document.getElementById('tab-learning').classList.contains('active');
    if (!area) return;
    area.innerHTML = '';

    let items;
    const isSearching = filter.trim() !== "";

    if (isSearching) {
        items = globalPhrases.filter(p => 
            p.pl.toLowerCase().includes(filter.toLowerCase()) || 
            p.en.toLowerCase().includes(filter.toLowerCase())
        ).slice(0, 40); 
    } else {
        items = isLearning ? activePool : phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);
        if (isLearning && currentLevel !== 0) items = items.slice(0, 12);
    }

    visibleItems = items; 

    items.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        
        if (isSearching) {
            tile.innerHTML = `<div style="font-size:0.6rem; color:var(--pol-red);">LVL ${p.levelOrigin}</div><div>${isSwapped ? p.en : p.pl}</div>`;
        } else if (currentLevel === 0) {
            const d = alphaHints[p.pl] || { e: '' };
            tile.innerHTML = `<div style="font-size: 1.4rem;">${p.pl}</div><div style="font-size: 0.9rem;">${d.e}</div>`;
        } else {
            tile.innerText = isSwapped ? p.en : p.pl;
        }

        // Color coding for progress
        const score = stats[p.pl] || 0;
        if (score > 0 && currentLevel !== 0) {
            const opacity = Math.min(score / THRESHOLD, 1);
            tile.style.backgroundColor = `rgba(220, 20, 60, ${opacity})`;
        }
        
        tile.onclick = () => {
            if (isSearching) {
                speak(p.pl);
            } else if (currentLevel === 0) {
                const d = alphaHints[p.pl] || { j: '' };
                speak(`${p.pl} jak ${d.j}`); 
            } else {
                isLearning ? checkAnswer(p, tile) : speak(p.pl);
            }
        };
        area.appendChild(tile);
    });
    updateTabCounts();
}

// 6. QUIZ LOGIC
function nextRound() {
    if (document.getElementById('search-bar').value.trim() !== "") return;
    const qText = document.getElementById('q-text');
    
    const sourcePool = (currentLevel === 0) ? phrasesData : ((visibleItems.length > 0) ? visibleItems : activePool);

    if (!sourcePool || sourcePool.length === 0) return;

    let newTarget;
    let attempts = 0;
    do {
        newTarget = sourcePool[Math.floor(Math.random() * sourcePool.length)];
        attempts++;
    } while (quizHistory.includes(newTarget.pl) && attempts < 10 && sourcePool.length > 2);

    currentTarget = newTarget;
    quizHistory.push(currentTarget.pl);
    if (quizHistory.length > 3) quizHistory.shift();

    qText.style.fontSize = (currentLevel === 0) ? "2.5rem" : "1.1rem";
    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    
    if (!isSwapped) {
        speak(currentLevel === 0 ? `Znajdź: ${currentTarget.pl}` : currentTarget.pl);
    }
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        streakCounter++;
        playFeedback('correct');
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        
        document.getElementById('feedback').innerText = `Combo: ${streakCounter}`;
        setTimeout(() => {
            document.getElementById('feedback').innerText = "";
            if (currentLevel !== 0 && stats[p.pl] >= THRESHOLD) {
                activePool = activePool.filter(i => i.pl !== p.pl);
            }
            updateMap();
            nextRound();
        }, 600);
    } else {
        streakCounter = 0; 
        playFeedback('wrong');
        tile.style.backgroundColor = 'var(--wrong-blue)';
        setTimeout(() => tile.style.backgroundColor = '', 400);
    }
}

// 7. HANDS-FREE MODE
async function startHandsFree() {
    if (hfActive && !hfPaused) return; 
    hfActive = true; hfAbort = false; hfPaused = false;
    const display = document.getElementById('hf-speaking-display');
    const centerDisplay = document.getElementById('hf-current-phrase');

    while (hfActive && !hfAbort && activePool.length > 0) {
        if (hfPaused) { await sleep(500); continue; }
        let p = activePool[Math.floor(Math.random() * activePool.length)];

        let sequence = (currentLevel === 0) ? 
            [{ text: p.pl, rate: 1.0, lang: 'pl-PL' }] : 
            [{ text: p.pl, rate: 1.0, lang: 'pl-PL' }, { text: p.en, rate: 1.0, lang: 'en-US' }];

        for (let item of sequence) {
            if (hfAbort || hfSkip) break;
            display.innerText = item.text; 
            centerDisplay.innerText = item.text; 
            await speakAsync(item.text, item.rate, item.lang);
            await sleep(hfDelay);
        }
        hfSkip = false;
    }
}

// 8. UTILS
function speak(text, rate = 1.0, lang = 'pl-PL') {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang; msg.rate = rate;
    window.speechSynthesis.speak(msg);
}

function speakAsync(text, rate, lang = 'pl-PL') {
    return new Promise(resolve => {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang; msg.rate = rate;
        msg.onend = resolve;
        window.speechSynthesis.speak(msg);
    });
}

function playFeedback(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(type === 'correct' ? 600 : 150, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function toggleDropdown() { document.getElementById('lvl-menu').classList.toggle('show'); }
function saveStats() { localStorage.setItem('pl_stats', JSON.stringify(stats)); }
function handleSearch() { updateMap(document.getElementById('search-bar').value); }
function toggleSwap() { isSwapped = !isSwapped; localStorage.setItem('pl_swap', isSwapped); updateMap(); nextRound(); }
function switchMode(m) {
    document.getElementById('tab-learning').classList.toggle('active', m === 'learning');
    document.getElementById('tab-mastered').classList.toggle('active', m === 'mastered');
    updateMap();
}
function updateTabCounts() {
    const mastered = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD).length;
    document.getElementById('learning-count').innerText = `(${phrasesData.length - mastered})`;
    document.getElementById('banked-count').innerText = `(${mastered})`;
}
function applyUILang() { document.getElementById('ui-lang-btn').innerText = uiLang; }
function stopHandsFree() { hfActive = false; hfAbort = true; window.speechSynthesis.cancel(); toggleHandsFreePanel(); }
function toggleHandsFreePanel() {
    const p = document.getElementById('handsfree-controls');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}
