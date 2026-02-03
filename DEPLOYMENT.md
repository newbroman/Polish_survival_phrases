# Deployment Guide

## Quick Deploy to GitHub Pages

### 1. Create Repository
```bash
# Create a new repository on GitHub (e.g., "polish-phrase-master")
# Don't initialize with README
```

### 2. Upload Files
```bash
# Extract the pwa-version.tar.gz
# Navigate to the pwa-version directory
cd pwa-version

# Initialize git
git init
git add .
git commit -m "Initial commit - Polish Phrase Master PWA"

# Add remote and push
git remote add origin https://github.com/YOUR-USERNAME/polish-phrase-master.git
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Your app will be live at: `https://YOUR-USERNAME.github.io/polish-phrase-master/`

### 4. Install as PWA
Once deployed, visit the URL in a mobile browser:
- **Chrome/Edge**: Tap the ⋮ menu → "Install app"
- **Safari (iOS)**: Tap Share → "Add to Home Screen"

## Alternative: Deploy to Netlify

1. Go to [netlify.com](https://www.netlify.com/)
2. Sign up/login
3. Drag and drop the `pwa-version` folder
4. Your app is instantly live with a custom URL
5. (Optional) Set up custom domain

## Updating the Service Worker

When you make changes to the app, increment the version in `service-worker.js`:

```javascript
const CACHE_NAME = 'polish-phrase-master-v2';  // Increment this
```

This ensures users get the latest version.

## Testing Locally

```bash
# Serve with Python
python3 -m http.server 8000

# Or with Node.js
npx http-server -p 8000

# Visit http://localhost:8000
```

## Troubleshooting

**Service Worker not updating?**
- Increment `CACHE_NAME` version in `service-worker.js`
- Clear browser cache (Ctrl+Shift+Delete)
- In DevTools: Application → Service Workers → Unregister

**PWA not installing?**
- Must be served over HTTPS (GitHub Pages does this automatically)
- Check manifest.json is accessible
- Verify icons exist (icon-192.png, icon-512.png)

**Audio not working?**
- Ensure browser supports Web Speech API
- Check browser permissions for audio
- Try Chrome/Edge for best compatibility
