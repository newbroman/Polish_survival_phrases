/**
 * app_logic.js
 * COMPLETE ENGINE: Includes Pitch-Shifting Combo Beeps, 4x3 Grid Sync, 
 * Global Search Indexing, and Advanced Hands-Free Study Mode.
 */

// --- GLOBAL STATE ---
let globalPhrases = []; 
let visibleItems = []; 
let streakCounter = 0;
let hfActive = false;
let hfPaused = false;
let hfAbort = false;
let hfSkip = false;
let hfDelay = 3000; 
let quizHistory = []; 

// --- INITIALIZATION ---
async function init() {
    await buildGlobalIndex(); // Builds the master list for search
    await populateLevelMenu();
    loadLevel(currentLevel);
    applyUILang();
}

async function buildGlobalIndex() {
    globalPhrases = [];
    // Adjust 15 to the actual number of levels you have
    for (let i = 0; i <= 15; i++) {
        try {
            const response = await fetch(`phrases_${i}.json`);
            if (response.ok) {
                const data = await response.json();
                // Tag each phrase with its level for the "teleport" search feature
                const tagged = data.phrases.map(p => ({ ...p, levelOrigin: i }));
                globalPhrases = globalPhrases.concat(tagged);
            }
        } catch (e) { 
            console.log(`Index built: ${globalPhrases.length} total phrases.`);
            break; 
        }
    }
}

// --- DATA & LEVEL LOADING ---
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
        
        const trigger = document.getElementById('lvl-current');
        if (trigger) trigger.innerText = `Level ${lvl}: ${data.description || 'Phrases'}`;
        
        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
        streakCounter = 0; 
        updateMap();
        nextRound();
    } catch (e) { console.error("Load failed:", e); }
}

// --- GRID RENDERING ---
function updateMap(filter = "") {
    const area = document.getElementById('mastery-map');
    const isLearning = document.getElementById('tab-learning').classList.contains('active');
    if (!area) return;
    area.innerHTML = '';

    let items;
    const isSearching = filter.trim() !== "";

    if (isSearching) {
        // GLOBAL SEARCH: Look through every phrase in the entire app
        items = globalPhrases.filter(p => 
            p.pl.toLowerCase().includes(filter.toLowerCase()) || 
            p.en.toLowerCase().includes(filter.toLowerCase())
        ).slice(0, 40); 
    } else {
        // STANDARD VIEW: Current level tabs
        items = isLearning ? 
            activePool : 
            phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);

        if (isLearning && currentLevel !== 0) {
            items = items.slice(0, 12);
        }
    }

    visibleItems = items; 

    items.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        
        if (isSearching) {
            tile.innerHTML = `
                <div style="font-size:0.6rem; color:var(--pol-red); margin-bottom:4px;">LVL ${p.levelOrigin}</div>
                <div style="font-size:0.8rem;">${isSwapped ? p.en : p.pl}</div>
            `;
        } else if (currentLevel === 0) {
            const details = alphaHints[p.pl] || { h: '', e: '' };
            tile.innerHTML = `<span>${p.pl}</span><span class="hint">${details.h} ${details.e}</span>`;
        } else {
            tile.innerText = isSwapped ? p.en : getGenderText(p);
        }

        const score = stats[p.pl] || 0;
        if (score > 0) {
            const opacity = Math.min(score / THRESHOLD, 1);
            tile.style.backgroundColor = `rgba(220, 20, 60, ${opacity})`;
        }
        
        tile.onclick = () => {
            if (isSearching) {
                if (p.levelOrigin !== currentLevel) {
                    currentLevel = p.levelOrigin;
                    localStorage.setItem('pl_current_level', currentLevel);
                    loadLevel(currentLevel);
                    document.getElementById('search-bar').value = ""; 
                }
                speak(p.pl);
            } else {
                isLearning ? checkAnswer(p, tile) : speak(p.pl);
            }
        };
        area.appendChild(tile);
    });
    updateTabCounts();
}

// --- TUNED AUDIO FEEDBACK (200Hz to 2200Hz over 70 tiles) ---
function playFeedback(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
        const pitch = Math.min(200 + (streakCounter * 28.57), 2200);
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else {
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
}

// --- QUIZ LOGIC ---
function nextRound() {
    // Stop quiz logic if searching
    if (document.getElementById('search-bar').value.trim() !== "") return;

    const qText = document.getElementById('q-text');
    const sourcePool = (visibleItems.length > 0) ? visibleItems : activePool;

    if (activePool.length === 0) {
        showCelebration();
        return;
    }

    let newTarget;
    let attempts = 0;
    do {
        newTarget = sourcePool[Math.floor(Math.random() * sourcePool.length)];
        attempts++;
    } while (quizHistory.includes(newTarget.pl) && attempts < 10 && sourcePool.length > 2);

    currentTarget = newTarget;
    quizHistory.push(currentTarget.pl);
    if (quizHistory.length > 2) quizHistory.shift();

    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        streakCounter++;
        playFeedback('correct');
        if (isSwapped) speak(p.pl);
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        document.getElementById('feedback').innerText = `Combo: ${streakCounter}`;
        setTimeout(() => {
            if (stats[p.pl] >= THRESHOLD) activePool = activePool.filter(i => i.pl !== p.pl);
            document.getElementById('feedback').innerText = "";
            updateMap();
            nextRound();
        }, 800);
    } else {
        streakCounter = 0; 
        playFeedback('wrong');
        tile.style.backgroundColor = 'var(--wrong-blue)';
        document.getElementById('feedback').innerText = "Błąd!";
    }
}

function showCelebration() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
    const notes = [200, 400, 600, 800, 1200];
    notes.forEach((pitch, i) => {
        setTimeout(() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(pitch, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
        }, i * 150);
    });
}

function advanceLevel() {
    document.getElementById('overlay').style.display = 'none';
    currentLevel++;
    localStorage.setItem('pl_current_level', currentLevel);
    loadLevel(currentLevel);
}

// --- HANDS-FREE STUDY MODE ---
function updatePauseSpeed() {
    hfDelay = parseInt(document.getElementById('hf-pause-speed').value);
}

function pauseHandsFree() { hfPaused = !hfPaused; }
function skipHandsFree() { hfSkip = true; }

async function startHandsFree() {
    if (hfActive && !hfPaused) return; 
    hfActive = true; hfAbort = false; hfPaused = false;

    const display = document.getElementById('hf-speaking-display');
    const centerDisplay = document.getElementById('hf-current-phrase');

    while (hfActive && !hfAbort && activePool.length > 0) {
        if (hfPaused) { await sleep(500); continue; }

        let p;
        let attempts = 0;
        do {
            p = activePool[Math.floor(Math.random() * activePool.length)];
            attempts++;
        } while (quizHistory.includes(p.pl) && attempts < 10 && activePool.length > 2);

        quizHistory.push(p.pl);
        if (quizHistory.length > 2) quizHistory.shift();

        const sequence = [
            { text: p.pl, rate: 1.0, lang: 'pl-PL' },
            { text: p.en, rate: 1.0, lang: 'en-US' },
            { text: p.pl, rate: 0.7, lang: 'pl-PL' },
            { text: p.pl, rate: 1.0, lang: 'pl-PL' }
        ];

        for (let item of sequence) {
            if (hfAbort || hfSkip) break;
            while (hfPaused && !hfAbort) { await sleep(500); }
            
            display.innerText = item.text; 
            centerDisplay.innerText = item.text; 
            
            await speakAsync(item.text, item.rate, item.lang);
            await sleep(hfDelay);
        }
        hfSkip = false;
        if (activePool.length > 0 && !hfAbort) await sleep(hfDelay);
    }
    if (!hfAbort) stopHandsFree();
}

function toggleHandsFreePanel() {
    const p = document.getElementById('handsfree-controls');
    const mask = document.getElementById('hf-speaking-display');
    if (p.style.display === 'flex') {
        stopHandsFree();
        mask.style.display = 'none';
    } else {
        p.style.display = 'flex';
        mask.style.display = 'flex'; // Activates the mask over icons
        mask.innerText = "Ready?";
        document.getElementById('hf-current-phrase').innerText = "Ready?";
    }
}

function stopHandsFree() {
    hfActive = false; hfAbort = true;
    document.getElementById('hf-speaking-display').innerText = "";
    document.getElementById('handsfree-controls').style.display = 'none';
    window.speechSynthesis.cancel();
}

// --- CORE UTILS ---
function speak(text, rate = 1.0, lang = 'pl-PL') {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang; msg.rate = rate;
    window.speechSynthesis.speak(msg);
}

function speakAsync(text, rate, lang = 'pl-PL') {
    return new Promise(resolve => {
        if (hfAbort) return resolve();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang; msg.rate = rate;
        msg.onend = resolve; msg.onerror = resolve;
        window.speechSynthesis.speak(msg);
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function applyUILang() {
    const langBtn = document.getElementById('ui-lang-btn');
    const lTab = document.getElementById('tab-learning');
    const bTab = document.getElementById('tab-mastered');
    if (langBtn) langBtn.innerText = uiLang;
    if (lTab) lTab.firstChild.textContent = uiTexts[uiLang].learning + " ";
    if (bTab) bTab.firstChild.textContent = uiTexts[uiLang].bank + " ";
}

function toggleUILanguage() {
    uiLang = (uiLang === 'EN') ? 'PL' : 'EN';
    localStorage.setItem('pl_ui_lang', uiLang);
    applyUILang();
}

function toggleSwap() {
    isSwapped = !isSwapped;
    localStorage.setItem('pl_swap', isSwapped);
    updateMap();
    nextRound();
}

function updateTabCounts() {
    const mastered = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD).length;
    const learning = phrasesData.length - mastered;
    document.getElementById('learning-count').innerText = `(${learning})`;
    document.getElementById('banked-count').innerText = `(${mastered})`;
}

function saveStats() { localStorage.setItem('pl_stats', JSON.stringify(stats)); }

function saveProgressToFile() {
    const blob = new Blob([JSON.stringify(stats)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `polish_progress.json`;
    a.click();
}

function loadProgressFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                stats = JSON.parse(ev.target.result);
                saveStats();
                location.reload();
            } catch(err) { alert("Invalid File"); }
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
}

function toggleDropdown() { document.getElementById('lvl-menu').classList.toggle('show'); }
function switchMode(m) {
    document.getElementById('tab-learning').classList.toggle('active', m === 'learning');
    document.getElementById('tab-mastered').classList.toggle('active', m === 'mastered');
    updateMap();
}
function handleSearch() {
    const query = document.getElementById('search-bar').value;
    updateMap(query);
}
function speakTarget() { if(currentTarget) speak(currentTarget.pl); }
function getGenderText(p) { return (currentGender === 'f' && p.pl_f) ? p.pl_f : p.pl; }
