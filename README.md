# Polish Phrase Master

A Progressive Web App for learning survival Polish, with flashcards, quizzes, typing practice and speech-recognition pronunciation scoring, all in a single self-contained HTML file with no build step and no frameworks.

**Live app:** https://newbroman.github.io/Polish_survival_phrases/

## Features

### Five practice modes

Switch between modes from the mode pill in the top bar.

- **Study**: flashcards to meet new phrases, with listen, speak, save and grammar-note hints.
- **Practice**: a timed tile quiz; the phrase plays and you tap the matching answer. Faster answers score more, and three correct answers mark a phrase as mastered.
- **Phrases**: browse every phrase in a level, each with its own listen and hold-to-speak buttons and progress badges.
- **Type**: type the Polish from the English prompt, with an on-screen accent bar (ą ć ę ł ń ó ś ź ż). Either gender form is accepted, case and punctuation are ignored, and near-misses where only the diacritics are wrong are flagged.
- **Sounds**: pronunciation drills for sounds English speakers find hardest (sz/ś, cz/ć, ż·rz/ź, the nasals ą/ę, y/i, ł/l, dz/dź/dż), using minimal pairs and the same speech scorer. The drills use their own dataset, independent of the level.

### Speech recognition and pronunciation coaching

- Two engines, chosen in Settings > Voice: **OpenAI** (most accurate for Polish; needs your own API key) or the **browser** Web Speech API (no key).
- Press-and-hold mic with a word-by-word scorecard: percentage, exact / close / missed breakdown, and a phonetic guide for the target phrase.
- Optional AI pronunciation coach giving one-line tips on what to fix.
- Compare your voice: after you speak, the app replays your recording followed by the native pronunciation (OpenAI engine).

### Levels and dictionary

- Level 0 is the Polish alphabet; numbered levels are themed phrase sets. Sub-levels such as 1.1, 5.1 or 12.1 are supported.
- **Level C (Sandbox)** is your personal list: search the built-in dictionary, or translate an English or Polish word straight into it (via the MyMemory translation API), and export it to a JSON file.
- **Level R (Review)** fills automatically with words that are due for review.

### Progress and retention

- Spaced repetition: mastered words are scheduled for review at growing intervals.
- Daily streak and a "due today" welcome banner, with one-tap access to your review queue.
- Progress dashboard (menu): words mastered, day streak, points, due count, average and best pronunciation score, per-level mastery bars and earned badges.

### Other

- Hands-free mode: sequential playback (Polish, English, slow Polish, repeat) for passive listening.
- Tap an audio button repeatedly to slow it down (half then quarter speed).
- Gender-aware phrases (masculine and feminine variants shown with spaces around the `/`, so both forms are spoken and accepted).
- Language toggle to flip prompt and answer direction; the choice is remembered.
- Dark mode (follows system setting), an onboarding tour, and an English / Polish interface.

## Using it

Open the live link in a browser.

- **Install:** on Android (Chrome or Edge) choose Install app from the address bar or menu; on iOS (Safari) use Share > Add to Home Screen. The manifest sets standalone display.
- **Offline:** the service worker caches the app shell, so it works offline after the first load. Phrase files are fetched network-first and fall back to the cache, so new levels appear as soon as you are online.
- **Browser requirements:** speech synthesis uses the browser's Web Speech API (a Polish voice is used if the device has one). Speech recognition needs either an OpenAI key or a browser that supports the Web Speech API (Chrome and Edge recommended). Progress is stored in `localStorage` on your device.

### Voice setup (optional but recommended)

Polish speech scoring is far more reliable with OpenAI:

1. Open Settings > Voice and follow the link to <https://platform.openai.com/api-keys>.
2. Create a secret key and paste it in.
3. The key is stored only on your device and sent only to OpenAI when you speak.

Without a key, the app falls back to the browser's built-in speech recognition.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | The entire app (HTML, CSS and JS in one file) |
| `manifest.json` | PWA manifest |
| `service-worker.js` | Offline caching (cache name `polish-master-vNN`) |
| `phrases_<level>.json` | One file per level, e.g. `phrases_0.json`, `phrases_5.json`, `phrases_5.1.json` |
| `input_jsons/`, `output_jsons/` | Working copies of level files used when expanding levels (see Development) |
| `expand_levels.py` | Script that uses the Gemini API to expand a skeletal level file |
| `icon-192.png`, `icon-512.png`, `icon.svg` | Icons |
| `nojekyll` | Empty file (see Notes) |

At start-up the app looks for `phrases_0.json`, `phrases_1.json` and so on up to 100, plus sub-levels `phrases_N.1.json` to `phrases_N.20.json` after each level found, and stops after three consecutive missing major levels. Levels therefore appear in filename order, and each file's `description` is used as its menu title. Level numbers are not contiguous (there is no 18, 19, 24, 26, 28 or 30); the scan copes with up to two missing numbers in a row, so never leave a gap of three or more.

Each level file looks like this:

```json
{
  "level": 3,
  "description": "Getting Around - Public Transport & Directions",
  "tier": "SURVIVAL",
  "phrases": [
    { "id": "s3_01", "category": "Directions", "pl": "W lewo", "en": "Left / To the left",
      "level": 3, "gender": null, "emoji": "⬅️", "note": "..." }
  ]
}
```

## Development

```bash
git clone https://github.com/newbroman/Polish_survival_phrases
cd Polish_survival_phrases
python3 -m http.server 8000
# open http://localhost:8000
```

A static server is required: the service worker and the `fetch` calls for phrase files do not work from `file://`.

When you change the app:

1. Bump the cache version in `service-worker.js` (`CACHE_NAME = 'polish-master-vNN'`) so installed copies pick up the new build. Skipping this is the usual reason a change does not show up in an installed PWA; fully close and reopen the app to let the new service worker activate.
2. Bump the app version in the `<title>` of `index.html`. The Help page version label reads from the title.

### Adding or editing phrase levels

To add a level, drop a correctly named `phrases_<N>.json` file in the root, following the schema above (ids of the form `s<level>_<number>`).

`expand_levels.py` automates enlarging a thin level file. For each configured level it reads `phrases_<level>.json`, sends it to Gemini (`gemini-2.5-flash`, temperature 0.4) with instructions to remove duplicates, add phrases until the level has at least 70, renumber ids as `s<level>_NN`, and add an `emoji` and a short grammar, pronunciation or cultural `note` to every phrase, keeping the existing schema. It retries up to three times, then writes the result to `phrases_<level>_expanded.json` in the current directory. As written, `run()` processes levels 12 and 13 only; edit it for others. It needs `pip install google-genai` and a Gemini API key in the `GEMINI_API_KEY` environment variable (`export GEMINI_API_KEY=...` before running). The expanded file is then reviewed by hand and, if good, renamed over the original. The `input_jsons/` and `output_jsons/` folders hold before-and-after versions of levels used in that workflow; the script itself does not read them.

## Notes

- The `nojekyll` file at the root is intended to stop GitHub Pages' Jekyll step from mishandling the phrase files. Jekyll only honours a file named `.nojekyll` (with a leading dot); GitHub Pages is also usually fine without it for a plain static site like this.
- MIT licence (as stated in the previous README; no licence file is in the repository).
- Built with vanilla JavaScript. Pronunciation transcription uses the OpenAI API; speech synthesis and fallback recognition use the Web Speech API; confetti uses `canvas-confetti` from jsDelivr (cached by the service worker).

Built by Martin Hollingham.
