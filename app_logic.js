/**
 * app_logic.js
 * The core engine handling data, rendering, quiz flow, and Hands-Free mode.
 */

// --- INITIALIZATION ---

async function init() {
    await populateLevelMenu();
    loadLevel(currentLevel);
    applyUILang();
}

// --- DATA FETCHING ---

async function populateLevelMenu() {
    const menu = document.getElementById('lvl-menu');
    const trigger = document.getElementById('lvl-current');
    menu.innerHTML = '';

    // Scans for external phrases_0.json to phrases_15.json
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
        } catch (e) { /* Level doesn't exist, skip */ }
    }
}

async function loadLevel(lvl) {
    try {
        const response = await fetch(`phrases_${lvl}.json`);
        const data = await response.json();
        phrasesData = data.phrases;
        
        // Filter out mastered items for the learning pool
        activePool = phrasesData.filter(p => (stats[p.pl] || 0) < THRESHOLD);
        
        updateMap();
        nextRound();
    } catch (e) {
        console.error("Error loading level:", e);
    }
}

// --- GRID RENDERING ---

function updateMap(filter = "") {
    const area = document.getElementById('mastery-map');
    const isLearning = document.getElementById('tab-learning').classList.contains('active');
    area.innerHTML = '';

    // ALPHABET VS STANDARD GRID
    if (currentLevel === 0) {
        area.classList.add('grid-alphabet');
    } else {
        area.classList.remove('grid-alphabet');
    }

    let items = [];
    if (isLearning) {
        // Filter by search bar if text is present
        items = activePool.filter(p => 
            !filter || 
            p.pl.toLowerCase().includes(filter.toLowerCase()) || 
            p.en.toLowerCase().includes(filter.toLowerCase())
        );
        // Force 4x3 grid (max 12 items) for standard levels
        if (currentLevel !== 0) items = items.slice(0, 12);
    } else {
        // Show all Mastered/Banked items
        items = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);
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

        // Apply visual mastery scoring
        const score = stats[p.pl] || 0;
        if (score > 0) tile.style.backgroundColor = `rgba(220, 20, 60, ${score/THRESHOLD})`;
        
        tile.onclick = () => isLearning ? checkAnswer(p, tile) : speak(p.pl);
        area.appendChild(tile);
    });

    updateTabCounts();
}

// --- QUIZ LOGIC ---

function nextRound() {
    if (activePool.length === 0) {
        document.getElementById('q-text').innerText = "Level Mastered! 🏆";
        return;
    }
    currentTarget = activePool[Math.floor(Math.random() * activePool.length)];
    // Question logic: if swapped, ask in Polish, answer in English
    document.getElementById('q-text').innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        if (isSwapped) speak(p.pl);
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        document.getElementById('feedback').innerText = "Dobrze!";
        
        setTimeout(() => {
            if (stats[p.pl] >= THRESHOLD) {
                activePool = activePool.filter(item => item.pl !== p.pl);
                updateMap();
            }
            nextRound();
        }, 800);
    } else {
        tile.classList.add('wrong');
        document.getElementById('feedback').innerText = "Spróbuj ponownie";
        setTimeout(() => tile.classList.remove('wrong'), 500);
    }
}

// --- HANDS-FREE ENGINE ---

let hfActive = false;
let hfAbort = false;

async function startHandsFree() {
    if (hfActive) return;
    hfActive = true;
    hfAbort = false;
    document.getElementById('hf-toggle-btn').classList.add('active-mode');

    while (hfActive && !hfAbort && activePool.length > 0) {
        let p = activePool[Math.floor(Math.random() * activePool.length)];
        currentTarget = p;
        updateMap();

        // 1. Polish (Slow)
        await speakAsync(p.pl, 0.8);
        await sleep(1500);
        
        // 2. English
        await speakAsync(p.en, 1.0, 'en-US');
        await sleep(1500);

        // 3. Polish (Normal)
        await speakAsync(p.pl, 1.0);
        await sleep(3000); // Wait for user to repeat
    }
}

function stopHandsFree() {
    hfActive = false;
    hfAbort = true;
    window.speechSynthesis.cancel();
    document.getElementById('hf-toggle-btn').classList.remove('active-mode');
}

// --- UTILITIES ---

function speak(text, rate = 1.0, lang = 'pl-PL') {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    msg.rate = rate;
    window.speechSynthesis.speak(msg);
}

function speakAsync(text, rate, lang = 'pl-PL') {
    return new Promise(resolve => {
        if (hfAbort) { resolve(); return; }
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang;
        msg.rate = rate;
        msg.onend = resolve;
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

function getGenderText(p) {
    return (currentGender === 'f' && p.pl_f) ? p.pl_f : p.pl;
}

function toggleDropdown() {
    document.getElementById('lvl-menu').classList.toggle('show');
}

function toggleSwap() {
    isSwapped = !isSwapped;
    localStorage.setItem('pl_swap', isSwapped);
    updateMap();
    nextRound();
}

function switchMode(mode) {
    document.getElementById('tab-learning').classList.toggle('active', mode === 'learning');
    document.getElementById('tab-mastered').classList.toggle('active', mode === 'mastered');
    updateMap();
}

function handleSearch() {
    const val = document.getElementById('search-bar').value;
    updateMap(val);
}

function saveStats() {
    localStorage.setItem('pl_stats', JSON.stringify(stats));
}

function resetEverything() {
    if(confirm("Reset all progress?")) {
        localStorage.clear();
        location.reload();
    }
}

function toggleHandsFreePanel() {
    const panel = document.getElementById('handsfree-controls');
    panel.style.display = (panel.style.display === 'none') ? 'flex' : 'none';
}
// --- PROGRESS FILE MANAGEMENT ---

function saveProgressToFile() {
    const data = JSON.stringify(stats);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polish_progress_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function loadProgressFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const loadedStats = JSON.parse(event.target.result);
                stats = loadedStats;
                saveStats(); // Save to localStorage
                alert("Progress Loaded!");
                location.reload();
            } catch (err) {
                alert("Invalid file format.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- UI LANGUAGE LOGIC ---

function applyUILang() {
    const langBtn = document.getElementById('ui-lang-btn');
    const learnTab = document.getElementById('tab-learning');
    const bankTab = document.getElementById('tab-mastered');
    
    if (langBtn) langBtn.innerText = uiLang;
    
    // Update tab text based on uiTexts dictionary in app_data.js
    if (learnTab) {
        const count = document.getElementById('learning-count').innerText;
        learnTab.innerHTML = `${uiTexts[uiLang].learning} <span id="learning-count">${count}</span>`;
    }
    if (bankTab) {
        const count = document.getElementById('banked-count').innerText;
        bankTab.innerHTML = `${uiTexts[uiLang].bank} <span id="banked-count">${count}</span>`;
    }

    // Update the dropdown title if it exists
    const trigger = document.getElementById('lvl-current');
    if (trigger && phrasesData.description) {
        trigger.innerText = `Level ${currentLevel}: ${phrasesData.description}`;
    }
}

function toggleUILanguage() {
    uiLang = (uiLang === 'EN') ? 'PL' : 'EN';
    localStorage.setItem('pl_ui_lang', uiLang);
    applyUILang();
}
function advanceLevel() {
    document.getElementById('overlay').style.display = 'none';
    currentLevel++;
    localStorage.setItem('pl_current_level', currentLevel);
    loadLevel(currentLevel);
}
