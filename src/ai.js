import { state } from './state.js';
import { scanLibrary } from './storage.js';
import { selectLevel } from './ui.js';

export function saveOpenAIKey() {
    const input = document.getElementById('openai-key-input');
    if (!input) return;

    const key = input.value.trim();
    if (key.length < 20 && key.length > 0) {
        alert("This doesn't look like a valid OpenAI API key.");
        return;
    }

    state.openAIKey = key;
    localStorage.setItem('pl_openai_key', key);

    const status = document.getElementById('openai-key-status');
    if (status) {
        status.innerText = key ? "✅ Key saved securely in your browser." : "";
        status.style.color = "var(--pol-green)";
    }

    if (key === "") {
        alert("API Key removed.");
    }
}

export function openAIGenerator() {
    if (!state.openAIKey) {
        alert("Please explicitly enter your OpenAI API Key in Settings first (⚙️ -> Data Management -> AI Key).");
        toggleSettings();
        return;
    }

    const el = document.getElementById('ai-overlay');
    if (el) el.style.display = 'flex';
}

export function closeAIGenerator() {
    const el = document.getElementById('ai-overlay');
    if (el) el.style.display = 'none';
}

export async function generateCustomLevel() {
    const promptInput = document.getElementById('ai-prompt-input');
    const countInput = document.getElementById('ai-count-input');
    const btn = document.getElementById('ai-generate-btn');
    const status = document.getElementById('ai-status');

    if (!promptInput || !promptInput.value.trim()) {
        alert("Please enter a topic or prompt for the phrases.");
        return;
    }

    const prompt = promptInput.value.trim();
    const count = countInput ? countInput.value : "20";

    btn.disabled = true;
    btn.innerText = "⏳ Generating... (This may take 10-20 seconds)";
    status.innerText = "";

    const systemPrompt = `You are a Polish language expert. Create a custom JSON list of exactly ${count} Polish phrases based on the user's prompt. 
    You MUST respond with ONLY raw, valid JSON. Do not include markdown formatting, backticks, or any conversational text.
    The root level must be a JSON object matching this schema exactly:
    {
      "level": "AI",
      "description": "Short title describing the prompt",
      "tier": "CUSTOM",
      "phrases": [
        {
          "id": "ai_1",
          "category": "Theme Category",
          "pl": "The Polish phrase",
          "en": "The English translation",
          "level": "AI",
          "emoji": "A single relevant emoji",
          "note": "A short practical usage note in English",
          "grammar_1": "A short grammatical explanation (e.g., case used, verb conjugation)"
        }
      ]
    }`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.openAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Failed to reach OpenAI API.");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        let levelData;
        try {
            levelData = JSON.parse(content);
        } catch (e) {
            throw new Error("AI returned invalid JSON formatting.");
        }

        if (!levelData.phrases || !Array.isArray(levelData.phrases)) {
            throw new Error("AI returned JSON without a phrases array.");
        }

        // Save the level
        const uniqueId = `AI_${Date.now()}`;
        state.customLevels.push({
            id: uniqueId,
            data: levelData
        });

        localStorage.setItem('pl_custom_levels', JSON.stringify(state.customLevels));

        // Clean up and refresh
        promptInput.value = '';
        closeAIGenerator();

        await scanLibrary();
        selectLevel(uniqueId);
        if (window.renderSettingsCustomLevels) window.renderSettingsCustomLevels();

        alert(`Successfully generated and imported "${levelData.description}" (${levelData.phrases.length} phrases)!`);

    } catch (error) {
        status.innerText = `❌ Error: ${error.message}`;
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Generate Phrases";
    }
}
