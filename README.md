# Polish Phrase Master - PWA

An interactive Polish language learning quiz with audio pronunciation, designed as a Progressive Web App.

## Features

- 🎯 Interactive tile-based quiz interface
- 🔊 Audio pronunciation with Polish voice synthesis
- 🎵 Musical feedback tones for correct/incorrect answers
- 👥 Gender-aware phrases (male/female/both variants)
- 🔄 Language swap mode (EN↔PL)
- 🎧 Hands-free learning mode with sequential playback
- 📱 PWA - Install on mobile devices and use offline
- 💾 Progress tracking with save/load functionality
- 🌓 Dark mode support

## Installation

### GitHub Pages Deployment

1. Create a new repository on GitHub
2. Upload all files from this directory
3. Go to Settings → Pages
4. Select "Deploy from a branch" and choose `main` branch
5. Your app will be available at `https://yourusername.github.io/repository-name/`

### Local Development

1. Clone the repository
2. Serve with any static file server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser

### Install as PWA

Once deployed:
1. Visit the URL in Chrome/Edge/Safari
2. Click the install icon in the address bar
3. Or use browser menu: "Install app" / "Add to Home Screen"

## File Structure

```
pwa-version/
├── index.html              # Main app file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── icon-192.png           # App icon (192x192)
├── icon-512.png           # App icon (512x512)
├── phrases_0.json         # Level 0 phrases
├── phrases_1.json         # Level 1 phrases
└── ...                    # Additional phrase levels
```

## Usage

### Practice Mode
- Select a level from the dropdown
- Listen to the Polish phrase
- Click the correct tile to answer
- Build up your mastery (3 correct answers per phrase)

### Hands-Free Mode
- Click "▼ Hands-Free" to expand the panel
- Click "▶ START HANDS-FREE" to begin
- Listen to sequential phrases: Polish → English → Polish (slow) → Polish (normal)
- Skip phrases with the SKIP button
- Pause anytime with the PAUSE button

### Banked Tab
- View all mastered phrases (3+ correct answers)
- Click any tile to hear pronunciation

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ Requires browser support for Web Speech API

## License

MIT License - Feel free to use and modify

## Credits

Built with vanilla JavaScript, no frameworks required.
