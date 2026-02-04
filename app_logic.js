/* --- GLOBAL STATE & PERSISTENCE --- */
let stats = JSON.parse(localStorage.getItem('pl_stats')) || {};
let currentLevel = parseInt(localStorage.getItem('pl_current_level')) || 1;
let uiLang = localStorage.getItem('pl_ui_lang') || 'EN';
let isSwapped = localStorage.getItem('pl_swap') === 'true';
const THRESHOLD = 5;

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
let hfDelay = 3000; 

/* --- INITIALIZATION --- */
async function init() {
    await buildGlobalIndex(); 
    await populateLevelMenu();
    loadLevel(currentLevel);
}

async function buildGlobalIndex() {
    globalPhrases = [];
    for (let i = 1; i <= 15; i++) { // Starting from 1 to avoid broken Level 0
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

async function loadLevel(lvl) {
    try {
        const response = await fetch(`phrases_${lvl}.json`);
        if (!response.ok) return;
        const data = await response.json();
        phrasesData = data.phrases;
        
        const area = document.getElementById('mastery-map');
        if (area) area.className = 'grid'; // Pure 3-column grid
        
        const trigger = document.getElementById('lvl-current');
        if (trigger) trigger.innerText = `Level ${lvl}: ${data.description}`;

        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
        updateMap();
        nextRound();
    } catch (e) { console.error("Load failed:", e); }
}

/* --- GRID RENDERING --- */
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
        if (isLearning) items = items.slice(0, 12);
    }
    visibleItems = items; 

    items.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerText = isSwapped ? p.en : p.pl;

        const score = stats[p.pl] || 0;
        if (score > 0) {
            const opacity = Math.min(score / THRESHOLD, 1);
            tile.style.background = `linear-gradient(145deg, rgba(220, 20, 60, ${opacity}), rgba(180, 0, 40, ${opacity}))`;
            if (opacity > 0.6) tile.style.color = 'white';
        }
        
        tile.onclick = () => {
            if (isSearching) speak(p.pl);
            else isLearning ? checkAnswer(p, tile) : speak(p.pl);
        };
        area.appendChild(tile);
    });
    updateTabCounts();
}

/* --- QUIZ LOGIC --- */
function nextRound() {
    const qText = document.getElementById('q-text');
    if (!visibleItems.length) return;

    let newTarget;
    do {
        newTarget = visibleItems[Math.floor(Math.random() * visibleItems.length)];
    } while (quizHistory.includes(newTarget.pl) && visibleItems.length > 1);

    currentTarget = newTarget;
    quizHistory.push(currentTarget.pl);
    if (quizHistory.length > 5) quizHistory.shift();

    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        streakCounter++;
        playFeedback('correct');
        tile.style.background = "#28a745"; // Success Green
        tile.style.color = "white";
        
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        
        setTimeout(() => {
            if (stats[p.pl] >= THRESHOLD) {
                activePool = activePool.filter(i => i.pl !== p.pl);
            }
            updateMap();
            nextRound();
        }, 600);
    } else {
        streakCounter = 0; 
        playFeedback('wrong');
        tile.style.background = "#dc3545"; // Error Red
        setTimeout(() => { tile.style.background = ""; }, 400);
    }
}

/* --- HANDS-FREE MODE (SANDWICH) --- */
async function startHandsFree() {
    if (hfActive) return;
    hfActive = true; hfAbort = false;
    const mask = document.getElementById('hf-speaking-display');
    if (mask) mask.style.display = 'flex';
    
    while (hfActive && !hfAbort && activePool.length > 0) {
        let p = activePool[Math.floor(Math.random() * activePool.length)];
        
        // 1. Polish
        mask.innerText = p.pl;
        await speakAsync(p.pl, 0.8, 'pl-PL');
        await sleep(2000);
        
        // 2. English
        mask.innerText = p.en;
        await speakAsync(p.en, 1.0, 'en-US');
        await sleep(2000);
        
        // 3. Polish
        mask.innerText = p.pl;
        await speakAsync(p.pl, 1.0, 'pl-PL');
        await sleep(3000);
    }
}

/* --- UTILS --- */
function speak(text, rate = 1.0, lang = 'pl-PL') {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang; msg.rate = rate;
    window.speechSynthesis.speak(msg);
}

function speakAsync(text, rate, lang) {
    return new Promise(resolve => {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang; msg.rate = rate;
        msg.onend = resolve;
        window.speechSynthesis.speak(msg);
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function playFeedback(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(type === 'correct' ? 600 : 150, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
}

function saveStats() { localStorage.setItem('pl_stats', JSON.stringify(stats)); }
function toggleDropdown() { document.getElementById('lvl-menu').classList.toggle('show'); }
function handleSearch() { updateMap(document.getElementById('search-bar').value); }
function toggleSwap() { isSwapped = !isSwapped; localStorage.setItem('pl_swap', isSwapped); updateMap(); nextRound(); }

async function populateLevelMenu() {
    const menu = document.getElementById('lvl-menu');
    if (!menu) return;
    menu.innerHTML = '';
    for (let i = 1; i <= 15; i++) {
        try {
            const response = await fetch(`phrases_${i}.json`);
            if (response.ok) {
                const data = await response.json();
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerText = `Level ${i}: ${data.description}`;
                item.onclick = () => { currentLevel = i; loadLevel(i); toggleDropdown(); };
                menu.appendChild(item);
            }
        } catch (e) {}
    }
}

function updateTabCounts() {
    const mastered = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD).length;
    const lCount = document.getElementById('learning-count');
    const bCount = document.getElementById('banked-count');
    if(lCount) lCount.innerText = `(${phrasesData.length - mastered})`;
    if(bCount) bCount.innerText = `(${mastered})`;
}

function switchMode(m) {
    document.getElementById('tab-learning').classList.toggle('active', m === 'learning');
    document.getElementById('tab-mastered').classList.toggle('active', m === 'mastered');
    updateMap();
}

function stopHandsFree() {
    hfActive = false; hfAbort = true;
    window.speechSynthesis.cancel();
    document.getElementById('hf-speaking-display').style.display = 'none';
}
