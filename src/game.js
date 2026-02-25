import { state, getNextInterval, isDueForReview, THRESHOLD, MIN_SCORE, TIME_SLOW, TIME_DISTRACTED } from './state.js';
import { scanLibrary } from './storage.js';
import { speak, playNote, playSuccess, playWrongSlide } from './audio.js';
import { updateMap, updatePointsUI, updateTabCounts, updateQuestionText, t, fireConfetti } from './ui.js';

export let isAppFrozen = false;


function getAppFrozen() { return isAppFrozen; }
function setAppFrozen(val) { isAppFrozen = val; }

export function refreshActivePool() {
    if (state.currentLevel === "0") {
        state.activePool = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) < THRESHOLD);
        return;
    }

    if (state.currentLevel === "R") {
        if (state.activePool.length !== 8) {
            state.activePool = new Array(8).fill(null);
        }
        let unmastered = state.phrasesData.filter(p => isDueForReview(p));

        for (let i = 0; i < 8; i++) {
            if (!state.activePool[i] || !isDueForReview(state.activePool[i])) {
                let nextPhrase = unmastered.find(p => !state.activePool.some(ap => ap && ap.pl === p.pl));
                state.activePool[i] = nextPhrase || null;
            }
        }
        return;
    }

    if (state.activePool.length !== 8) {
        state.activePool = new Array(8).fill(null);
    }

    let unmastered = state.phrasesData.filter(p => (state.stats[p.pl] ? state.stats[p.pl].score : 0) < THRESHOLD);

    for (let i = 0; i < 8; i++) {
        if (!state.activePool[i] || (state.stats[state.activePool[i].pl] ? state.stats[state.activePool[i].pl].score : 0) >= THRESHOLD) {
            let nextPhrase = unmastered.find(p => !state.activePool.some(ap => ap && ap.pl === p.pl));
            state.activePool[i] = nextPhrase || null;
        }
    }
}

export function startNewRound() {
    clearInterval(state.roundTimer);
    document.getElementById('timer-bar').style.width = "100%";
    document.getElementById('timer-bar').className = "";

    let validPool = state.activePool.filter(p => p !== null);

    if (!validPool.length) {
        document.getElementById('q-text').innerText = "Done!";
        if (document.getElementById('btn-hint')) document.getElementById('btn-hint').style.display = 'none';
        setAppFrozen(false);
        document.body.classList.remove('app-frozen');
        return;
    }

    let historyLimit = Math.min(3, validPool.length - 1);
    let nextTarget;

    if (validPool.length === 1) {
        nextTarget = validPool[0];
    } else {
        do {
            nextTarget = validPool[Math.floor(Math.random() * validPool.length)];
        } while (historyLimit > 0 && state.recentPhrasesQueue.includes(nextTarget.pl));
    }

    state.currentTarget = nextTarget;
    state.recentPhrasesQueue.push(state.currentTarget.pl);

    if (state.recentPhrasesQueue.length > 3) {
        state.recentPhrasesQueue.shift();
    }

    updateQuestionText();
    document.getElementById('feedback').innerText = "";
    state.questionStartTime = Date.now();

    state.roundTimer = setInterval(() => {
        // Phase 2: Freeze timer if reading a hint or globally paused
        if (state.isTimerPaused || state.isGamePaused) {
            state.questionStartTime += 50;
            return;
        }

        let elapsed = Date.now() - state.questionStartTime;
        let pct = Math.max(0, 100 - (elapsed / TIME_DISTRACTED) * 100);
        let tBar = document.getElementById('timer-bar');

        if (tBar) {
            tBar.style.width = pct + "%";
            if (elapsed > TIME_SLOW && elapsed <= 8000) {
                tBar.className = "timer-warning";
            } else if (elapsed > 8000) {
                tBar.className = "timer-danger";
            }
        }
        if (elapsed >= TIME_DISTRACTED) {
            clearInterval(state.roundTimer);
            document.getElementById('feedback').innerText = t('tooSlow');
            document.getElementById('feedback').style.color = "var(--pol-red)";
        }
    }, 50);

    setTimeout(() => {
        let textToSpeak = state.currentLevel === "0" ? state.currentTarget.pl + " jak " + state.currentTarget.word : state.currentTarget.pl;
        speak(textToSpeak, 1.0, () => {
            setAppFrozen(false);
            document.body.classList.remove('app-frozen');
        });
    }, 300);
}

export function addPoints(pts) {
    let todayStr = new Date().toDateString();

    if (state.userData.lastPlayDate !== todayStr) {
        if (state.userData.lastPlayDate) {
            let todayTime = new Date(todayStr).getTime();
            let lastPlayTime = new Date(state.userData.lastPlayDate).getTime();
            let daysDiff = Math.abs(Math.round((todayTime - lastPlayTime) / (1000 * 3600 * 24)));

            if (daysDiff === 1) {
                state.userData.dailyStreak = (state.userData.dailyStreak || 0) + 1;
            } else if (daysDiff > 1) {
                state.userData.dailyStreak = 1; // Reset streak if missed more than 1 day
            }
        } else {
            state.userData.dailyStreak = 1; // First time playing
        }
        state.userData.dailyPoints = 0;
        state.userData.lastPlayDate = todayStr;
    } else if (state.userData.dailyStreak === 0) {
        state.userData.dailyStreak = 1;
    }

    let previousPoints = state.userData.dailyPoints;
    state.userData.totalPoints = Math.max(0, state.userData.totalPoints + pts);
    state.userData.dailyPoints = Math.max(0, state.userData.dailyPoints + pts);

    if (state.userData.totalPoints >= 3000 && !state.userData.badges.includes("Novice")) state.userData.badges.push("Novice");
    if (state.userData.totalPoints >= 15000 && !state.userData.badges.includes("Pro")) state.userData.badges.push("Pro");
    if (state.userData.totalPoints >= 30000 && !state.userData.badges.includes("Master")) state.userData.badges.push("Master");
    if (state.userData.totalPoints >= 100000 && !state.userData.badges.includes("Legend")) state.userData.badges.push("Legend");

    if (state.correctStreak > state.userData.bestStreak) state.userData.bestStreak = state.correctStreak;

    // Optionally fire confetti if they hit their daily 1000 point goal.
    if (state.userData.dailyPoints >= 1000 && previousPoints < 1000) {
        if (state.userData.lastGoalDate !== todayStr) {
            // (Removed the arbitrary streak++ here as it's now handled by the consecutive day login)
            state.userData.lastGoalDate = todayStr;
            fireConfetti(100);
        }
    }

    localStorage.setItem('pl_user_data', JSON.stringify(state.userData));
    updatePointsUI();
}

export function checkAnswer(phrase, el) {
    if (getAppFrozen()) return;
    setAppFrozen(true);
    document.body.classList.add('app-frozen');

    clearInterval(state.roundTimer);
    let timeTaken = Date.now() - state.questionStartTime;
    let isDistracted = timeTaken >= TIME_DISTRACTED;

    // Fetch or create new stat object
    let pStat = state.stats[phrase.pl] || { score: 0, interval: 0, nextReview: 0 };

    if (phrase.pl === state.currentTarget.pl) {
        let pts = 10;
        if (isDistracted) {
            pts = 0;
            state.correctStreak = 0;
            state.basePitch = 220;
            document.getElementById('feedback').innerText = t('correctSlow');
            document.getElementById('feedback').style.color = "var(--gold)";
        } else {
            state.correctStreak++;
            let pitchOffset = (state.correctStreak % 5) * 30;
            playNote(state.basePitch + pitchOffset, 0.15, 'sine');

            if (state.correctStreak > 0 && state.correctStreak % 5 === 0) {
                state.basePitch = Math.min(state.basePitch + 20, 350);
                fireConfetti(state.correctStreak);
            }

            if (timeTaken > TIME_SLOW) pts -= 4;
            document.getElementById('feedback').innerText = t('correct');
            document.getElementById('feedback').style.color = "var(--success-green)";
        }

        addPoints(pts);

        // Phase 3 SRS Upgrades:
        pStat.score++;
        if (pStat.score >= THRESHOLD) {
            // If the word was due for review today, successfully remembering it extends its interval!
            if (pStat.nextReview <= Date.now()) {
                pStat.interval = getNextInterval(pStat.interval);
                // Add slight random offset to review times so they don't pile up on exact milliseconds
                let randomHourOffset = Math.floor(Math.random() * 3600000);
                pStat.nextReview = Date.now() + (pStat.interval * 86400000) + randomHourOffset;
            }
        }
        state.stats[phrase.pl] = pStat;

        if (state.currentLevel === "0") speak(phrase.pl + " jak " + phrase.word);

        setTimeout(() => {
            refreshActivePool();
            updateMap();
            updateTabCounts();

            let validPool = state.activePool.filter(p => p !== null);
            if (validPool.length === 0) {
                playSuccess();
                setAppFrozen(false);
                document.body.classList.remove('app-frozen');
            } else {
                startNewRound();
            }
        }, 600);

    } else {
        state.correctStreak = 0;
        state.basePitch = 220;

        let pts = isDistracted ? 0 : -5;
        addPoints(pts);
        playWrongSlide();

        // Phase 3 SRS Penalty Logic:
        let penalizeWord = (wordPl) => {
            let s = state.stats[wordPl] || { score: 0, interval: 0, nextReview: 0 };
            if (s.score >= THRESHOLD) {
                s.score = -1;
                s.interval = 0;
                s.nextReview = 0;
            } else {
                s.score = Math.max(MIN_SCORE, s.score - 1);
            }
            state.stats[wordPl] = s;
        };

        penalizeWord(state.currentTarget.pl);

        if (el) el.classList.add('wrong');
        document.getElementById('feedback').innerText = t('mistake');
        document.getElementById('feedback').style.color = "var(--pol-red)";

        setTimeout(() => {
            if (el) el.classList.remove('wrong');
            refreshActivePool();
            updateMap();
            startNewRound();
        }, 1000);
    }
    localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
}

export function resetLevelMastery(enableHardMode = false) {
    let msg = enableHardMode ? "Reset and practice in Hard Mode (Audio Only)?" : "Are you sure you want to practice this level again?";

    if (confirm(msg)) {
        if (state.currentLevel !== "C" && state.currentLevel !== "R" && state.currentLevel !== "0") {
            state.userData.levelCompletions[state.currentLevel] = (state.userData.levelCompletions[state.currentLevel] || 0) + 1;
            localStorage.setItem('pl_user_data', JSON.stringify(state.userData));
        }

        state.phrasesData.forEach(p => { delete state.stats[p.pl]; });
        saveStats();

        state.hardMode = enableHardMode;
        state.activePool = [];
        refreshActivePool();
        updateMap();
        updateTabCounts();
        startNewRound();
        scanLibrary();
    }
}

export function saveStats() {
    localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
    localStorage.setItem('pl_current_level_idx', state.currentLevel);
}

