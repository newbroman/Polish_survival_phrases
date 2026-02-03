/**
 * app_logic.js
 * Final Version: Fixed Quiz-Grid Sync, Audio Feedback, and Level Labels.
 */

let visibleItems = []; // Tracks only what's currently on the 4x3 grid
let streakCounter = 0;

// --- INITIALIZATION ---
async function init() {
    await populateLevelMenu();
    loadLevel(currentLevel);
    applyUILang();
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
        
        // Update the Level Selector Label
        const trigger = document.getElementById('lvl-current');
        if (trigger) trigger.innerText = `Level ${lvl}: ${data.description || 'Phrases'}`;
        
        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
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

    if (currentLevel === 0) area.classList.add('grid-alphabet');
    else area.classList.remove('grid-alphabet');

    let items = isLearning ? 
        activePool.filter(p => !filter || p.pl.toLowerCase().includes(filter.toLowerCase()) || p.en.toLowerCase().includes(filter.toLowerCase())) :
        phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);

    // CRITICAL FIX: Sync quiz with visible 4x3 grid
    if (isLearning && currentLevel !== 0) {
        items = items.slice(0, 12);
        visibleItems = items; 
    } else {
        visibleItems = items; 
    }

    items.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (currentLevel === 0) {
            const details = alphaHints[p.pl] || { h: '', e: '' };
            tile.innerHTML = `<span>${p.pl}</span><span class="hint">${details.h} ${details.e}</span>`;
        } else {
            tile.innerText = isSwapped ? p.en : getGenderText(p);
        }

        const score = stats[p.pl] || 0;
        if (score > 0) tile.style.backgroundColor = `rgba(220, 20, 60, ${score/THRESHOLD})`;
        
        tile.onclick = () => isLearning ? checkAnswer(p, tile) : speak(p.pl);
        area.appendChild(tile);
    });
    updateTabCounts();
}

// --- AUDIO FEEDBACK (The Tones) ---
function playFeedback(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
        // Base frequency of 200Hz, increasing by 32Hz for every streak point
        // Caps at 2500Hz so it doesn't get too piercing
        const pitch = Math.min(200 + (streakCounter * 32), 2500);
        
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); 
        osc.stop(ctx.currentTime + 0.2);
    } else {
        // Low buzz for wrong answer
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); 
        osc.stop(ctx.currentTime + 0.3);
    }
}

// --- QUIZ LOGIC ---
function nextRound() {
    const qText = document.getElementById('q-text');
    const sourcePool = (visibleItems.length > 0) ? visibleItems : activePool;

    // Trigger celebration if everything is mastered
    if (activePool.length === 0) {
        showCelebration();
        return;
    }
    
    currentTarget = sourcePool[Math.floor(Math.random() * sourcePool.length)];
    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function showCelebration() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex'; // Shows the hidden box
    
    // Play a little victory arpeggio
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

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        streakCounter++; // Increment streak
        playFeedback('correct');
        
        if (isSwapped) speak(p.pl);
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        
        document.getElementById('feedback').innerText = `Combo: ${streakCounter}!`;
        
        setTimeout(() => {
            if (stats[p.pl] >= THRESHOLD) activePool = activePool.filter(i => i.pl !== p.pl);
            document.getElementById('feedback').innerText = "";
            updateMap();
            nextRound();
        }, 800);
    } else {
        streakCounter = 0; // Reset streak on error
        playFeedback('wrong');
        tile.style.backgroundColor = 'var(--wrong-blue)';
        document.getElementById('feedback').innerText = "Błąd!";
    }
}

// --- HANDS-FREE ENGINE ---
let hfActive = false;
let hfAbort = false;

async function startHandsFree() {
    if (hfActive) return;
    hfActive = true; hfAbort = false;
    document.getElementById('hf-toggle-btn').style.color = 'var(--pol-red)';

    while (hfActive && !hfAbort && activePool.length > 0) {
        let p = activePool[Math.floor(Math.random() * activePool.length)];
        currentTarget = p;
        updateMap();
        await speakAsync(p.pl, 1.0);      // Polish
        await sleep(1500);                // Pause
        await speakAsync(p.en, 1.0, 'en-US'); // English
        await sleep(1500);                // Pause
        await speakAsync(p.pl, 0.7);      // Polish (Slow)
        await sleep(1500);                // Pause
        await speakAsync(p.pl, 1.0);      // Polish (Final)
        await sleep(3500);                // Repeat Pause
    }
    stopHandsFree();
}

function stopHandsFree() {
    hfActive = false; hfAbort = true;
    window.speechSynthesis.cancel();
    document.getElementById('hf-toggle-btn').style.color = '';
}

// --- UI HELPERS ---
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

function updateTabCounts() {
    const mastered = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD).length;
    const learning = phrasesData.length - mastered;
    document.getElementById('learning-count').innerText = `(${learning})`;
    document.getElementById('banked-count').innerText = `(${mastered})`;
}

// --- FILE & DATA MANAGEMENT ---
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
function handleSearch() { updateMap(document.getElementById('search-bar').value); }
function speakTarget() { if(currentTarget) speak(currentTarget.pl); }
function toggleHandsFreePanel() {
    const p = document.getElementById('handsfree-controls');
    p.style.display = (p.style.display === 'none') ? 'flex' : 'none';
}
function resetEverything() { if(confirm("Reset progress?")) { localStorage.clear(); location.reload(); } }
function getGenderText(p) { return (currentGender === 'f' && p.pl_f) ? p.pl_f : p.pl; }
