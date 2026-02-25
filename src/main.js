import * as UI from './ui.js';
import { state } from './state.js';
import { isListening, initAudioContext, playNote, playSuccess, playWrongSlide, initSpeech, speak, initSpeechRecognition, toggleMic, stopListening, cleanStr, checkSpokenAnswer } from './audio.js';
import { refreshActivePool, startNewRound, addPoints, checkAnswer, resetLevelMastery, saveStats } from './game.js';
import { scanLibrary, cacheAllPhrases, exportCustomLevel, downloadProgress, importProgress, resetEverything } from './storage.js';

// --- MODULE TO GLOBAL BRIDGE ---


// --- MODULE TO GLOBAL BRIDGE ---
window.resetLevelMastery = resetLevelMastery;
window.closeHint = UI.closeHint;
window.startNewRound = startNewRound;
window.sleep = UI.sleep;
window.playSuccess = playSuccess;
window.toggleSettings = UI.toggleSettings;
window.toggleHelp = UI.toggleHelp;
window.renderStudyCard = UI.renderStudyCard;
window.resetEverything = resetEverything;
window.handleSpeakerTap = UI.handleSpeakerTap;
window.importProgress = importProgress;
window.showMobileHeaderTemp = UI.showMobileHeaderTemp;
window.cacheAllPhrases = cacheAllPhrases;
window.toggleContentSwap = UI.toggleContentSwap;
window.updateMap = UI.updateMap;
window.openHandsFree = UI.openHandsFree;
window.updateQuestionText = UI.updateQuestionText;
window.playWrongSlide = playWrongSlide;
window.speakAsync = UI.speakAsync;
window.initSpeechRecognition = initSpeechRecognition;
window.toggleMic = toggleMic;
window.saveCurrentToCustom = UI.saveCurrentToCustom;
window.runHandsFreeLoop = UI.runHandsFreeLoop;
window.downloadProgress = downloadProgress;
window.switchMode = UI.switchMode;
window.playStudyAudio = UI.playStudyAudio;
window.speak = speak;
window.t = UI.t;
window.checkAnswer = checkAnswer;
window.toggleStudyNotes = UI.toggleStudyNotes;
window.scanLibrary = scanLibrary;
window.initSpeech = initSpeech;
window.nextStudyCard = UI.nextStudyCard;
window.refreshActivePool = refreshActivePool;
window.toggleUILang = UI.toggleUILang;
window.exportCustomLevel = exportCustomLevel;
window.playNote = playNote;
window.setPauseDuration = UI.setPauseDuration;
window.checkSpokenAnswer = checkSpokenAnswer;
window.togglePlayPauseHF = UI.togglePlayPauseHF;
window.initAudioContext = initAudioContext;
window.fireConfetti = UI.fireConfetti;
window.skipPhraseHF = UI.skipPhraseHF;
window.toggleDropdown = UI.toggleDropdown;
window.showHint = UI.showHint;
window.updateUILanguage = UI.updateUILanguage;
window.selectLevel = UI.selectLevel;
window.copyToClipboard = UI.copyToClipboard;
window.getGenderText = UI.getGenderText;
window.prevStudyCard = UI.prevStudyCard;
window.closeHandsFree = UI.closeHandsFree;
window.translateAndAdd = UI.translateAndAdd;
window.saveStats = saveStats;
window.togglePauseAudio = UI.togglePauseAudio;
window.stopListening = stopListening;
window.updatePointsUI = UI.updatePointsUI;
window.cleanStr = cleanStr;
window.handleSearch = UI.handleSearch;
window.updateTabCounts = UI.updateTabCounts;
window.addPoints = addPoints;

// Storage Module Bridge
window.scanLibrary = scanLibrary;
window.exportCustomLevel = exportCustomLevel;
window.importProgress = importProgress;
window.downloadProgress = downloadProgress;
window.resetEverything = resetEverything;

// Game Module Bridge
window.refreshActivePool = refreshActivePool;
window.startNewRound = startNewRound;
window.checkAnswer = checkAnswer;
window.resetLevelMastery = resetLevelMastery;
window.saveStats = saveStats;

console.log('Main.js is executing'); console.log('window.toggleSettings is:', typeof window.toggleSettings);
