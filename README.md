# Polish Phrase Master

An interactive Progressive Web App for learning survival Polish — flashcards, quizzes, typing practice, and real speech-recognition pronunciation scoring, all in a single self-contained HTML file with no build step and no frameworks.

**Live app:** https://newbroman.github.io/Polish_survival_phrases/

---

## Features

### Five practice modes
Switch between modes from the **mode pill** in the top bar.

- **📖 Study** — flashcards to meet new phrases, with listen, speak, save, and grammar-note hints.
- **⚡ Practice** — a timed tile quiz; the phrase plays and you tap the matching answer. Faster answers score more, and three correct marks a phrase as mastered.
- **🗂️ Phrases** — browse every phrase in a level, each with its own listen and hold-to-speak buttons and progress badges.
- **⌨️ Type** — type the Polish from the English prompt, with an on-screen accent bar (ą ć ę ł ń ó ś ź ż). Accepts either gender form, ignores case/punctuation, and flags near-misses where only the diacritics are wrong.
- **🗣️ Sounds** — pronunciation drills targeting the sounds English speakers find hardest (sz/ś, cz/ć, ż·rz/ź, the nasals ą/ę, y/i, ł/l, dz/dź/dż), using minimal pairs and the same speech scorer.

### Speech recognition & pronunciation coaching
- **Two engines:** **OpenAI** (Whisper, most accurate for Polish — requires a free API key) or the **browser** Web Speech API (faster, no key). Choose in *Settings → Voice*.
- **Press-and-hold mic** with a word-by-word pronunciation **scorecard**: percentage, exact / close / missed breakdown, and a phonetic guide for the target phrase.
- **AI pronunciation coach** — optional one-line tips on what to fix.
- **Compare your voice** — after you speak, the app replays *your* recording followed by the native pronunciation (OpenAI engine).

### Levels & dictionary
- **Level 0** is the Polish alphabet; numbered levels are themed phrase sets.
- **Level C (Sandbox)** is your personal list — search the built-in dictionary or **translate** any English/Polish word straight into it, and **export** it to a file.
- **Level R (Review)** auto-fills with words that are due, powered by spaced repetition.

### Progress & retention
- **Spaced repetition (SRS):** mastered words are scheduled for review at growing intervals (1 → 3 → 7 → 14 → 30 days …).
- **Daily streak + “due today”** welcome banner on launch, with one-tap access to your review queue.
- **Progress dashboard** (☰ menu → 📊): words mastered, day streak, total points, due count, average/best pronunciation score, per-level mastery bars, and earned badges.

### Other
- **🎧 Hands-free mode** — sequential playback (Polish → English → slow Polish → repeat) for passive listening.
- **Multi-tap to slow down** any audio (tap again for ½× then ¼× speed).
- **Gender-aware phrases** (masculine / feminine variants) shown with spaces around the `/` so both forms are spoken and accepted.
- **Language toggle** (🇵🇱↔🇬🇧) to flip prompt/answer direction; choice is remembered.
- **Dark mode**, an **onboarding tour**, and **offline-capable PWA** install.

---

## Install as an app

Once the site is deployed and served over HTTPS:

- **Android / Chrome / Edge:** open the URL and choose **Install app** (address bar or ⋮ menu).
- **iOS / Safari:** **Share → Add to Home Screen** (launches standalone via the web-app meta tags).

The app caches its files via the service worker, so it works offline after the first load.

---

## Voice setup (optional but recommended)

Polish speech scoring is far more reliable with OpenAI:

1. Open **Settings → Voice** (☰ menu) and follow the link to <https://platform.openai.com/api-keys>.
2. Sign in (new accounts include free credit), create a secret key, and paste it in.
3. The key is stored only on your device and sent only to OpenAI when you speak.

Without a key, the app falls back to the browser's built-in speech recognition.

---

## File structure

```
.
├── index.html            # The entire app (HTML + CSS + JS in one file)
├── manifest.json         # PWA manifest
├── service-worker.js     # Offline caching
├── icon-192.png          # App icon (192×192)
├── icon-512.png          # App icon (512×512)
├── phrases_0.json        # Level 0 (alphabet)
├── phrases_1.json        # Level 1
└── ...                   # Additional level files
```

---

## Local development

```bash
git clone https://github.com/newbroman/Polish_survival_phrases
cd Polish_survival_phrases
python3 -m http.server 8000
# open http://localhost:8000
```

A static server is required (the service worker and `fetch` for phrase files won't run from `file://`).

### Conventions (important)
This is a **single-file app** — almost everything lives in `index.html`. When you change it:

1. **Bump the cache version** in `service-worker.js` (`CACHE_NAME = 'polish-master-vNN'`) so installed copies pick up the new build.
2. **Bump the app version** in the `<title>` of `index.html`. The Help-page version label reads from the title automatically, so there's only one number to change.

Skipping step 1 is the usual reason a change "doesn't show up" in an installed PWA — fully close and reopen the app to let the new service worker activate.

---

## Deployment (GitHub Pages)

1. Push to the `main` branch.
2. **Settings → Pages → Build and deployment → Source:** *Deploy from a branch*, branch `main`, folder `/(root)`.
3. The app serves at `https://<username>.github.io/<repo>/`.

> Tip: a `.nojekyll` file in the root prevents Jekyll from choking on phrase filenames that contain commas. To confirm a deploy went live, check the version shown in the Help footer in a private/incognito window.

---

## Browser compatibility

- ✅ Chrome / Edge (recommended)
- ✅ Safari (iOS / macOS)
- ✅ Firefox
- ⚠️ Speech recognition needs either an OpenAI key or browser Web Speech API support.

---

## License

MIT License — free to use and modify.

## Credits

Built with vanilla JavaScript — no frameworks, no build step. Pronunciation transcription via the OpenAI API; speech synthesis and fallback recognition via the Web Speech API.
