import { state, isDueForReview, THRESHOLD } from './state.js';
import { selectLevel, t } from './ui.js';

let isScanning = false;
export async function scanLibrary() {
    if (isScanning) return;
    isScanning = true;
    try {
        const menu = document.getElementById('lvl-menu');
        menu.innerHTML = '';
        state.levelList = [];

        let consecutiveEmptyMajors = 0;
        const MAX_CONSECUTIVE_EMPTY_MAJORS = 3;
        const MAX_CONSECUTIVE_EMPTY_MINORS = 2;

        for (let major = 0; major <= 100; major++) {
            let majorFound = false;
            try {
                const r = await fetch(`${import.meta.env.BASE_URL}phrases_${major}.json`, { cache: 'no-store' });
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
                        const rMinor = await fetch(`${import.meta.env.BASE_URL}phrases_${minorId}.json`, { cache: 'no-store' });
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

        if (!state.levelList.find(l => l.id == state.currentLevel)) state.currentLevel = state.levelList[0].id;

        // Render dropdown: R and C pinned to the top, then numeric levels
        const renderOrder = [
            ...state.levelList.filter(l => l.id === 'R'),
            ...state.levelList.filter(l => l.id === 'C'),
            ...state.levelList.filter(l => l.id !== 'R' && l.id !== 'C').sort((a, b) => parseFloat(a.id) - parseFloat(b.id)),
        ];

        menu.innerHTML = '';
        renderOrder.forEach(lvl => {
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
            item.onclick = (e) => { e.stopPropagation(); selectLevel(lvl.id); };
            menu.appendChild(item);
        });
    } finally {
        isScanning = false;
    }
}

export async function cacheAllPhrases() {
    state.allPhrasesCache = [];
    state.levelList.forEach(lvl => {
        if (lvl.id !== "R" && lvl.data && lvl.data.phrases) {
            lvl.data.phrases.forEach(p => state.allPhrasesCache.push({ ...p, lvl: lvl.id }));
        }
    });
}

export function exportCustomLevel() {
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

export function downloadProgress() {
    const b = new Blob([JSON.stringify({ stats: state.stats, userData: state.userData })], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `polish_master.txt`;
    a.click();
}

export function importProgress(event) {
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

export function resetEverything() {
    if (confirm("Clear ALL data and restart?")) {
        localStorage.clear();
        location.reload();
    }
}

