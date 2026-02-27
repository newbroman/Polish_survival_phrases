import { checkAnswer, addPoints } from './game.js';
import { state, THRESHOLD, MIN_SCORE } from './state.js';
import { nextStudyCard, updateMap, hfActive, handleHandsFreeCommand } from './ui.js';

export function initAudioContext() {
    if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }

    if (!state.audioKeepAliveInterval) {
        state.audioKeepAliveInterval = setInterval(() => {
            if (state.audioCtx && state.audioCtx.state === 'suspended') {
                state.audioCtx.resume();
            }
            try {
                const o = state.audioCtx.createOscillator();
                const g = state.audioCtx.createGain();
                g.gain.value = 0.001;
                o.connect(g);
                g.connect(state.audioCtx.destination);
                o.start();
                o.stop(state.audioCtx.currentTime + 0.01);
            } catch (e) { }
        }, 20000);
    }
}

export function playNote(freq, dur, type = 'sine') {
    initAudioContext();
    try {
        const now = state.audioCtx.currentTime;
        const o = state.audioCtx.createOscillator();
        const g = state.audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.1, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + dur);
        o.connect(g);
        g.connect(state.audioCtx.destination);
        o.start();
        o.stop(now + dur);
    } catch (e) { }
}


export function playWrongSlide() {
    initAudioContext();
    try {
        const now = state.audioCtx.currentTime;
        const o = state.audioCtx.createOscillator();
        const g = state.audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, now);
        o.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        o.connect(g);
        g.connect(state.audioCtx.destination);
        o.start();
        o.stop(now + 0.4);
    } catch (e) { }
}

export function playSuccess() {
    playNote(523, 0.2, 'triangle');
    setTimeout(() => playNote(659, 0.2, 'triangle'), 100);
    setTimeout(() => playNote(783, 0.4, 'triangle'), 200);
}

export function initSpeech() {
    state.plVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('pl'));
}

export function speak(t, rate = 1.0, onEndCallback = null) {
    initAudioContext();
    window.speechSynthesis.cancel();
    const m = new SpeechSynthesisUtterance(t);
    if (state.plVoice) m.voice = state.plVoice;
    m.lang = 'pl-PL';
    m.rate = rate;

    if (onEndCallback) {
        let callbackFired = false;
        const safeCallback = () => {
            if (!callbackFired) {
                callbackFired = true;
                onEndCallback();
            }
        };
        m.onend = safeCallback;
        m.onerror = safeCallback;
        setTimeout(safeCallback, 4000);
    }

    window.speechSynthesis.speak(m);
}

// ==========================================
// VOICE RECOGNITION (MIC)
// ==========================================
let recognition;
export let isListening = false;

export function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.SpeechRecognition) {
        recognition = new SpeechRecognition();

        // Use continuous listening when HandsFree is active
        recognition.continuous = false; // dynamically set later in start process
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            document.getElementById('mic-btn').classList.add('mic-active');
            if (!hfActive) {
                document.getElementById('feedback').innerText = "Listening... 🎤";
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();

            if (hfActive) {
                handleHandsFreeCommand(transcript);
            } else {
                checkSpokenAnswer(transcript);
            }
        };

        recognition.onerror = (e) => {
            if (!hfActive) {
                document.getElementById('feedback').innerText = "Mic error / nothing heard.";
                document.getElementById('feedback').style.color = "var(--pol-red)";
                stopListening();
            }
        };

        recognition.onend = () => {
            isListening = false;
            // auto-restart listening if hands-free is still active and we haven't aborted entirely
            if (hfActive) {
                try {
                    recognition.start();
                } catch (e) { }
            } else {
                stopListening();
            }
        };
    }
}

export function toggleMic(forceStartForHF = false) {
    if (!recognition) {
        alert("Voice recognition not supported in this browser. Please use Chrome or Safari over HTTPS.");
        return;
    }
    if (isListening && !forceStartForHF) {
        recognition.stop();
    } else if (!isListening || forceStartForHF) {
        try {
            recognition.stop();
        } catch (e) { }

        recognition.continuous = hfActive; // Use continuous mode for HF

        // Listen to Polish by default for HF commands to catch "dalej", "powtórz" etc., but it often figures it out anyway
        recognition.lang = state.isSwapped && !hfActive ? 'en-US' : 'pl-PL';

        try {
            recognition.start();
        } catch (e) { }
    }
}

export function stopListening() {
    isListening = false;
    document.getElementById('mic-btn').classList.remove('mic-active');
}

export function cleanStr(str) {
    return str ? str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim() : "";
}

export function checkSpokenAnswer(transcript) {
    if (!state.currentTarget) return;

    const expected = state.isSwapped ? state.currentTarget.en : state.currentTarget.pl;
    const eClean = cleanStr(expected);
    const tClean = cleanStr(transcript);

    let match = (tClean === eClean);

    if (state.currentLevel === "0" && cleanStr(state.currentTarget.word) === tClean) {
        match = true;
    }

    if (!state.isSwapped && state.currentTarget.variants) {
        if (cleanStr(state.currentTarget.variants.m) === tClean || cleanStr(state.currentTarget.variants.f) === tClean) {
            match = true;
        }
    }

    if (document.getElementById('tab-study').classList.contains('active')) {
        if (match) {
            document.getElementById('fc-pl').style.color = "var(--success-green)";
            playSuccess();
            setTimeout(() => {
                document.getElementById('fc-pl').style.color = "var(--pol-red)";
                nextStudyCard();
            }, 1500);
        } else {
            playWrongSlide();
        }
        return;
    }

    if (match) {
        let targetTile = Array.from(document.querySelectorAll('.tile')).find(t =>
            cleanStr(t.innerText) === eClean ||
            (state.currentLevel === "0" && t.innerHTML.toLowerCase().includes(tClean)) ||
            (state.currentTarget.variants && (cleanStr(t.innerText) === cleanStr(state.currentTarget.variants.m) || cleanStr(t.innerText) === cleanStr(state.currentTarget.variants.f)))
        );

        if (!targetTile) targetTile = document.createElement('div');

        checkAnswer(state.currentTarget, targetTile);
    } else {
        document.getElementById('feedback').innerText = `Heard: "${transcript}" ❌`;
        document.getElementById('feedback').style.color = "var(--pol-red)";

        state.correctStreak = 0;
        state.basePitch = 220;
        addPoints(-5);
        playWrongSlide();

        let cStat = state.stats[state.currentTarget.pl] || { score: 0, interval: 0, nextReview: 0 };
        if (cStat.score >= THRESHOLD) {
            cStat.score = -1;
            cStat.interval = 0;
            cStat.nextReview = 0;
        } else {
            cStat.score = Math.max(MIN_SCORE, cStat.score - 1);
        }
        state.stats[state.currentTarget.pl] = cStat;

        localStorage.setItem('pl_mastery_final', JSON.stringify(state.stats));
        updateMap();
    }
}
