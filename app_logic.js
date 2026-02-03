/* --- Root & Themes --- */
:root { 
    --pol-red: #dc143c; 
    --wrong-blue: #3498db; 
    --bg: #f0f2f5; 
    --card: #ffffff; 
    --text: #333; 
    --tile-bg: #dee2e6; 
}

@media (prefers-color-scheme: dark) { 
    :root { 
        --bg: #1a1a1a; 
        --card: #2d2d2d; 
        --text: #f0f0f0; 
        --tile-bg: #404040; 
    } 
}

/* --- Base Layout --- */
html, body { 
    height: 100%; 
    margin: 0; 
    overflow: hidden; 
    position: fixed; 
    width: 100%; 
    font-family: -apple-system, system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
}

body { display: flex; flex-direction: column; }

/* --- Header & Navigation --- */
.header { width: 100%; background: var(--card); border-bottom: 1px solid #ddd; flex-shrink: 0; }

.title-banner { 
    background: linear-gradient(to bottom, #ffffff 50%, var(--pol-red) 50%); 
    padding: 6px 0; 
    border-bottom: 1px solid #ccc;
}
.title { 
    font-weight: 800; font-size: 0.9rem; color: #333; 
    text-align: center; margin: 0; text-transform: uppercase; 
}

.controls-row { 
    width: 95%; max-width: 450px; 
    margin: 0 auto; padding: 8px 0; 
    display: flex; gap: 8px; align-items: center;
}

.custom-dropdown { flex: 4; position: relative; }
.dropdown-trigger { 
    width: 100%; background: var(--bg); border: 1px solid #ccc; color: var(--text); 
    padding: 0 12px; border-radius: 8px; font-size: 13px; font-weight: 700; 
    height: 44px; display: flex; align-items: center; justify-content: space-between; 
    cursor: pointer; box-sizing: border-box;
}
.dropdown-trigger::after { content: '▼'; font-size: 8px; color: #888; }

#ui-lang-btn { flex: 0.8; height: 32px; font-size: 10px; padding: 0; min-width: 45px; }

.dropdown-menu { 
    position: absolute; top: 100%; left: 0; right: 0; background: var(--card); 
    border: 1px solid #ccc; border-radius: 4px; max-height: 300px; overflow-y: auto; 
    z-index: 1000; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}
.dropdown-menu.show { display: block; }
.dropdown-item { padding: 12px; font-size: 12px; border-bottom: 1px solid #eee; cursor: pointer; }

/* --- Search & HF Row --- */
.search-container { padding: 0 10px 10px; display: flex; gap: 8px; align-items: center; max-width: 450px; margin: 0 auto; }
#search-bar { 
    flex: 4; height: 44px; font-size: 14px; padding: 0 12px; 
    border: 1px solid #ccc; border-radius: 8px; background: var(--card); 
    color: var(--text); box-sizing: border-box;
}

#hf-toggle-btn { flex: 1.2; height: 38px; font-size: 10px; padding: 0 8px; white-space: nowrap; }

/* --- Quiz Area --- */
.quiz-header { 
    position: relative; background: var(--card); padding: 15px; 
    border-bottom: 1px solid #ddd; flex-shrink: 0; min-height: 80px;
    display: flex; flex-direction: column; justify-content: center;
}
.quiz-top-row { display: flex; align-items: center; gap: 15px; width: 100%; justify-content: center; }
.icon-btn { 
    background: var(--bg); border: 1px solid #ddd; border-radius: 50%; 
    width: 44px; height: 44px; font-size: 1.2rem; display: flex; 
    align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}
.q-text { font-size: 1.1rem; font-weight: 800; text-align: center; flex: 1; max-width: 200px; }

#hf-speaking-display {
    display: none; position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: var(--card); z-index: 100; 
    align-items: center; justify-content: center;
    font-size: 1.3rem; font-weight: 800; color: var(--pol-red);
}

.feedback { height: 14px; font-size: 0.8rem; font-weight: bold; margin-top: 5px; color: var(--pol-red); text-align: center; }

/* --- Mode Tabs --- */
.mode-tabs { display: flex; background: var(--card); border-bottom: 1px solid #ddd; flex-shrink: 0; }
.tab { flex: 1; padding: 14px 2px; text-align: center; font-size: 0.75rem; font-weight: bold; cursor: pointer; opacity: 0.5; }
.tab.active { opacity: 1; border-bottom: 3px solid var(--pol-red); color: var(--pol-red); }

/* --- Grid System --- */
.map-section { 
    flex-grow: 1; padding: 10px; overflow-y: auto; 
    display: flex; flex-direction: column; align-items: center;
    position: relative; 
}

/* Default 3-column phrase grid */
.grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 8px;
    width: 100%;
    max-width: 500px;
}

/* 5-column alphabet grid for Level 0 */
.grid-alphabet {
    display: grid !important;
    grid-template-columns: repeat(5, 1fr) !important;
    gap: 6px !important;
    width: 100%;
    max-width: 500px;
}

.tile { 
    aspect-ratio: 1/1; 
    background: var(--tile-bg); 
    border-radius: 12px; 
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; padding: 4px; text-align: center; 
    font-size: 0.75rem; font-weight: 600; transition: transform 0.1s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.grid-alphabet .tile {
    font-size: 1.2rem;
    background: var(--card);
}

.tile:active { transform: scale(0.92); }
.tile .hint { font-size: 0.55rem; opacity: 0.8; margin-top: 3px; font-weight: 400; }

/* --- HF Study Mode Overlay --- */
.hf-overlay {
    display: none; position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--bg); z-index: 50;
    flex-direction: column; align-items: center; justify-content: center;
    padding: 20px;
}
.hf-content {
    width: 90%; max-width: 350px; background: var(--card);
    padding: 25px; border-radius: 20px; text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.hf-button-row { display: flex; gap: 10px; justify-content: center; margin: 20px 0; }
.hf-main-btn { padding: 12px 18px; border-radius: 10px; border: none; background: var(--pol-red); color: white; font-weight: bold; cursor: pointer; }

/* --- Footer --- */
.footer { padding: 10px 10px 24px; display: flex; gap: 8px; border-top: 1px solid #ddd; background: var(--card); }
.footer-btn { 
    background: var(--bg); border: 1px solid #ccc; color: var(--text); 
    font-size: 0.7rem; padding: 10px; border-radius: 8px; cursor: pointer; 
    flex: 1; font-weight: bold; text-transform: uppercase;
}

#overlay { 
    position: fixed; inset: 0; background: rgba(0,0,0,0.9); 
    display: none; flex-direction: column; align-items: center; 
    justify-content: center; z-index: 2000; color: white; 
}
