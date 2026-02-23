import os
import json
import re
from google import genai
from google.genai import types

API_KEY = "AIzaSyC89Lbx7jzfeEoJNIm6MHS1GkvBRcoFZAg"
client = genai.Client(api_key=API_KEY)

def extract_json(text):
    match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
    if match:
        return match.group(1)
    return text

def generate_level(level_id, title, existing_data):
    prompt = f"""
    You are an expert Polish linguist and curriculum designer. 
    I am giving you a skeletal JSON file of Polish phrases for a language learning app.
    
    CRITICAL INSTRUCTION: You MUST generate AT LEAST 70 items total for this category.
    
    Please perform the following upgrades and return ONLY valid JSON:
    1. Weed out any duplicate phrases or phrases that belong in earlier foundational levels.
    2. Add new, highly useful phrases specific to this category until the list reaches AT LEAST 70 items. Expand on vocab. Be thorough.
    3. Ensure every ID follows the format "s{level_id}_[NUMBER]" (e.g., s{level_id}_01, s{level_id}_75).
    4. Add an "emoji" field to every phrase.
    5. Add a "note" field to every phrase with a short grammar, pronunciation, or cultural hint.
    6. Maintain the exact JSON schema provided: "id", "category", "pl", "en", "level", "gender", "variants", "emoji", "note".
    
    Here is the skeletal JSON to start from and build upon:
    {existing_data}
    """

    print(f"Generating 70+ phrases for {title}...")
    
    max_retries = 3
    import time
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.4,
                )
            )
            break
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt == max_retries - 1:
                print("Max retries reached. Exiting.")
                return
            time.sleep(15)
    
    clean_json_string = extract_json(response.text)
    upgraded_json = json.loads(clean_json_string)
    
    output_path = f"phrases_{level_id}_expanded.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(upgraded_json, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Successfully saved {len(upgraded_json.get('phrases', []))} phrases to {output_path}!\n")

def run():
    with open('phrases_12.json', 'r', encoding='utf-8') as f:
        f12 = f.read()
    generate_level("12", "Time & Scheduling", f12)
    
    with open('phrases_13.json', 'r', encoding='utf-8') as f:
        f13 = f.read()
    generate_level("13", "Weather & Seasons", f13)

if __name__ == "__main__":
    run()
