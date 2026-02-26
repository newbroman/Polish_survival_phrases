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

        // Inject custom imported levels
        state.customLevels.forEach(cl => {
            state.levelList.push({ id: cl.id, desc: cl.data.description || `Custom: ${cl.id}`, data: cl.data, isCustomImport: true });
        });

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

        // Render dropdown: R and C pinned to the top, then custom imports, then numeric levels
        const renderOrder = [
            ...state.levelList.filter(l => l.id === 'R'),
            ...state.levelList.filter(l => l.id === 'C'),
            ...state.levelList.filter(l => l.isCustomImport),
            ...state.levelList.filter(l => l.id !== 'R' && l.id !== 'C' && !l.isCustomImport).sort((a, b) => parseFloat(a.id) - parseFloat(b.id)),
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
            } else if (lvl.id === "C") {
                item.className = 'dropdown-item sandbox';
                item.innerHTML = `<span>Lvl C: ${lvl.desc}${rBadge}</span>${isDone ? '<span class="check-icon">✅</span>' : ''}`;
            } else if (lvl.isCustomImport) {
                item.className = 'dropdown-item' + (isDone ? ' mastered' : '');
                item.innerHTML = `<span>⭐ ${lvl.desc}${rBadge}</span>${isDone ? '<span class="check-icon">✅</span>' : ''}`;
            } else {
                item.className = 'dropdown-item' + (isDone ? ' mastered' : '');
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

export function exportLevelR() {
    const lvlR = state.levelList.find(l => l.id === "R");
    if (!lvlR || !lvlR.data || lvlR.data.phrases.length === 0) {
        alert("Level R is currently empty. Nothing to export.");
        return;
    }

    // Create a standard phrase file object
    const exportData = {
        level: "R_Export",
        description: `Exported Review Phrases (${new Date().toLocaleDateString()})`,
        tier: "CUSTOM",
        phrases: lvlR.data.phrases
    };

    const b = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `phrases_R_${Date.now()}.json`;
    a.click();
}

export function importCustomLevel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.phrases || !Array.isArray(data.phrases)) {
                alert("Invalid file format. Ensure it contains a 'phrases' array.");
                return;
            }

            // Generate a unique ID for this level
            const newId = `U_${Date.now()}`;
            if (!data.description) data.description = file.name;

            state.customLevels.push({
                id: newId,
                data: data
            });

            localStorage.setItem('pl_custom_levels', JSON.stringify(state.customLevels));
            alert(`Level "${data.description}" imported successfully!`);

            // Clear input so the same file can be selected again if needed
            event.target.value = '';

            scanLibrary().then(() => {
                selectLevel(newId);
                // Also trigger a UI refresh to show the new list of custom levels in settings
                if (window.renderSettingsCustomLevels) window.renderSettingsCustomLevels();
            });
        } catch (e) {
            alert("Error parsing JSON file. Is it valid JSON?");
        }
    };
    r.readAsText(file);
}

export function deleteCustomLevel(id) {
    if (!confirm("Are you sure you want to delete this custom level?")) return;

    state.customLevels = state.customLevels.filter(cl => cl.id !== id);
    localStorage.setItem('pl_custom_levels', JSON.stringify(state.customLevels));

    if (state.currentLevel === id) {
        state.currentLevel = "0";
        localStorage.setItem('pl_current_level_idx', "0");
    }

    scanLibrary().then(() => {
        selectLevel(state.currentLevel);
        if (window.renderSettingsCustomLevels) window.renderSettingsCustomLevels();
    });
}

export function resetEverything() {
    if (confirm("Clear ALL data and restart?")) {
        localStorage.clear();
        location.reload();
    }
}

