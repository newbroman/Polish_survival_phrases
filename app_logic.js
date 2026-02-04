/* --- GLOBAL STATE --- */
let stats = JSON.parse(localStorage.getItem('pl_stats')) || {};
let currentLevel = parseInt(localStorage.getItem('pl_current_level')) || 1; // Default to Level 1
let isSwapped = localStorage.getItem('pl_swap') === 'true';
const THRESHOLD = 5;

let phrasesData = [];
let activePool = [];
let visibleItems = []; 
let currentTarget = null;
let streakCounter = 0;

let hfActive = false;
let hfPaused = false;
let hfAbort = false;
let hfDelay = 3000; 

/* --- INITIALIZATION --- */
async function init() {
    await populateLevelMenu();
    loadLevel(currentLevel);
}

async function loadLevel(lvl) {
    try {
        const response = await fetch(`phrases_${lvl}.json`);
        if (!response.ok) return;
        const data = await response.json();
        phrasesData = data.phrases;
        
        // Ensure standard grid class
        const area = document.getElementById('mastery-map');
        if (area) area.className = 'grid';
        
        const trigger = document.getElementById('lvl-current');
        if (trigger) trigger.innerText = `Level ${lvl}: ${data.description}`;

        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
        updateMap();
        nextRound();
    } catch (e) { console.error("Load failed:", e); }
}

/* --- GRID & QUIZ --- */
function updateMap() {
    const area = document.getElementById('mastery-map');
    const isLearning = document.getElementById('tab-learning').classList.contains('active');
    if (!area) return;
    area.innerHTML = '';

    let items = isLearning ? activePool.slice(0, 12) : phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);
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
            if (isLearning) checkAnswer(p, tile);
            else speak(p.pl);
        };
        area.appendChild(tile);
    });
}

function nextRound() {
    const qText = document.getElementById('q-text');
    if (!visibleItems.length) return;

    currentTarget = visibleItems[Math.floor(Math.random() * visibleItems.length)];
    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        streakCounter++;
        playFeedback('correct');
        tile.style.background = "#28a745";
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
        tile.style.background = "#dc3545";
        setTimeout(() => { tile.style.background = ""; }, 400);
    }
}

/* --- HANDS-FREE MODE (RESTORED) --- */
async function startHandsFree() {
    if (hfActive) return;
    hfActive = true; hfAbort = false;
    const mask = document.getElementById('hf-speaking-display');
    
    while (hfActive && !hfAbort && activePool.length > 0) {
        let p = activePool[Math.floor(Math.random() * activePool.length)];
        
        // Polish -> English -> Polish cycle
        mask.innerText = p.pl;
        await speakAsync(p.pl, 1.0, 'pl-PL');
        await sleep(hfDelay);
        
        mask.innerText = p.en;
        await speakAsync(p.en, 1.0, 'en-US');
        await sleep(hfDelay);
    }
}

function stopHandsFree() {
    hfActive = false; hfAbort = true;
    window.speechSynthesis.cancel();
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
function toggleSwap() { isSwapped = !isSwapped; localStorage.setItem('pl_swap', isSwapped); updateMap(); nextRound(); }
