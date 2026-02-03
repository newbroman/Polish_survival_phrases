/**
 * app_logic.js
 * The complete logic engine for Polish Master.
 */

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

    // Enforce 4x3 grid for Levels 1+
    if (isLearning && currentLevel !== 0) items = items.slice(0, 12);

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

// --- QUIZ LOGIC ---
function nextRound() {
    const qText = document.getElementById('q-text');
    if (activePool.length === 0) {
        qText.innerText = uiTexts[uiLang].victory;
        return;
    }
    currentTarget = activePool[Math.floor(Math.random() * activePool.length)];
    qText.innerText = isSwapped ? currentTarget.pl : currentTarget.en;
    if (!isSwapped) speak(currentTarget.pl);
}

function checkAnswer(p, tile) {
    if (p.pl === currentTarget.pl) {
        if (isSwapped) speak(p.pl);
        stats[p.pl] = (stats[p.pl] || 0) + 1;
        saveStats();
        document.getElementById('feedback').innerText = "Dobrze!";
        setTimeout(() => {
            if (stats[p.pl] >= THRESHOLD) activePool = activePool.filter(i => i.pl !== p.pl);
            document.getElementById('feedback').innerText = "";
            updateMap();
            nextRound();
        }, 800);
    } else {
        tile.style.backgroundColor = 'var(--wrong-blue)';
        document.getElementById('feedback').innerText = "Spróbuj ponownie";
    }
}

// --- HANDS-FREE ENGINE (Updated Sequence) ---
let hfActive = false;
let hfAbort = false;

async function startHandsFree() {
    if (hfActive) return;
    hfActive = true;
    hfAbort = false;
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
        await sleep(3500);                // Long Pause to digest
    }
    stopHandsFree();
}

function stopHandsFree() {
    hfActive = false;
    hfAbort = true;
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
    msg.lang = lang;
    msg.rate = rate;
    window.speechSynthesis.speak(msg);
}

function speakAsync(text, rate, lang = 'pl-PL') {
    return new Promise(resolve => {
        if (hfAbort) return resolve();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang; msg.rate = rate;
        msg.onend = resolve;
        msg.onerror = resolve;
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
function resetEverything() { if(confirm("Reset all progress?")) { localStorage.clear(); location.reload(); } }
function getGenderText(p) { return (currentGender === 'f' && p.pl_f) ? p.pl_f : p.pl; }
