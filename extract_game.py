import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    text = f.read()

funcs_to_extract = [
    'refreshActivePool',
    'startNewRound',
    'addPoints',
    'checkAnswer',
    'resetLevelMastery',
    'saveStats'
]

extracted_code = ""

for func in funcs_to_extract:
    match = re.search(rf'^(?:export\s+)?(?:async\s+)?function {func}\s*\(.*?\)\s*{{', text, flags=re.MULTILINE)
    if match:
        start_idx = match.start()
        idx = match.end() - 1
        brace_count = 0
        while idx < len(text):
            if text[idx] == '{':
                brace_count += 1
            elif text[idx] == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
            idx += 1
        end_idx = idx + 1
        
        extracted_code += "export " + text[match.start(0):end_idx].replace("export ", "") + "\n\n"
        
        # Remove from main.js
        text = text[:start_idx] + text[end_idx:]

# Define game.js header
header = """import { state, getNextInterval, isDueForReview, THRESHOLD, MIN_SCORE, TIME_SLOW, TIME_DISTRACTED } from './state.js';
import { scanLibrary } from './storage.js';
import { speak, playNote, playSuccess, playWrongSlide } from './audio.js';
import { updateMap, updatePointsUI, updateTabCounts, updateQuestionText, t, fireConfetti, isGamePaused } from './main.js';

export let isAppFrozen = false;

"""

extracted_code = extracted_code.replace("isAppFrozen = ", "setAppFrozen(")
extracted_code = extracted_code.replace("if (isAppFrozen)", "if (getAppFrozen())")

# Provide getter/setters for isAppFrozen to avoid readonly exports issues
helpers = """
function getAppFrozen() { return isAppFrozen; }
function setAppFrozen(val) { isAppFrozen = val; }

"""
extracted_code = helpers + extracted_code

with open('src/game.js', 'w', encoding='utf-8') as f:
    f.write(header + extracted_code)

# Add import back to main.js
import_stmt = "import { " + ", ".join(funcs_to_extract) + ", isAppFrozen } from './game.js';\n"
text = re.sub(r"import \{.*?audio\.js';", lambda m: m.group(0) + "\n" + import_stmt, text, count=1)

# we need to export isGamePaused from main.js
text = text.replace("let isGamePaused = false;", "export let isGamePaused = false;")
# Remove old isAppFrozen from main.js
text = re.sub(r"let isAppFrozen = false;\n+", "", text)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Extraction complete.")
