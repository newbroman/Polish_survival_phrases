/**
 * app_logic.js
 * Core engine for fetching data, rendering the grid, 
 * and handling quiz logic.
 */

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

    // Scans for your external phrases_0.json to phrases_15.json
    for (let i = 0; i <= 15; i++) {
        try {
            const response = await fetch(`phrases_${i}.json`);
            if (response.ok) {
                const data = await response.json();
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `<span>Level ${i}: ${data.description || 'Phrases'}</span>`;
                item.onclick = () => {
                    currentLevel = i;
                    localStorage.setItem('pl_current_level', i);
                    loadLevel(i);
                    toggleDropdown();
                };
                menu.appendChild(item);
                if (i === currentLevel) trigger.innerText = `Level ${i}: ${data.description}`;
            }
        } catch (e) { console.warn(`Level ${i} not found`); }
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

    // ALPHABET GRID LOGIC (6 columns)
    if (currentLevel === 0) {
        area.classList.add('grid-alphabet');
    } else {
        area.classList.remove('grid-alphabet');
    }

    const items = isLearning ? 
        activePool.filter(p => !filter || p.pl.toLowerCase().includes(filter.toLowerCase())) :
        phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD);

    items.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'tile';

        if (currentLevel === 0) {
            // Show Letter + Hint + Emoji from app-data.js
            const details = alphaHints[p.pl] || { h: '', e: '' };
            tile.innerHTML = `<span>${p.pl}</span><span class="hint">${details.h} ${details.e}</span>`;
        } else {
            tile.innerText = isSwapped ? p.en : getGenderText(p);
        }

        // Visual progress (Red for correct, Blue for incorrect)
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
            if (stats[p.pl] >= THRESHOLD) activePool = activePool.filter(item => item.pl !== p.pl);
            updateMap();
            nextRound();
        }, 800);
    } else {
        tile.style.backgroundColor = 'var(--wrong-blue)';
        document.getElementById('feedback').innerText = "Spróbuj ponownie";
    }
}

// --- UTILS ---

function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'pl-PL';
    window.speechSynthesis.speak(msg);
}

function updateTabCounts() {
    const mastered = phrasesData.filter(p => (stats[p.pl] || 0) >= THRESHOLD).length;
    const learning = phrasesData.length - mastered;
    
    const lCount = document.getElementById('learning-count');
    const bCount = document.getElementById('banked-count');
    if (lCount) lCount.innerText = `(${learning})`;
    if (bCount) bCount.innerText = `(${mastered})`;
}

function getGenderText(p) {
    if (currentGender === 'f' && p.pl_f) return p.pl_f;
    return p.pl;
}

function saveStats() {
    localStorage.setItem('pl_stats', JSON.stringify(stats));
}

function toggleDropdown() {
    document.getElementById('lvl-menu').classList.toggle('show');
}
