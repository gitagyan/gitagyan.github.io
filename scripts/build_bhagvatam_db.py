#!/usr/bin/env python3
import json
import sqlite3
import os
import glob

SRC_DIR = "/Users/simkeyur/src/antigravity-apps/bhagvatam.github.io/assets"
DEST_DIR = "/Users/simkeyur/src/Apps/bhagvadgeeta-app/www/bhagvatam/assets/data"
DB_PATH = os.path.join(DEST_DIR, "bhagvatam.db")

os.makedirs(DEST_DIR, exist_ok=True)
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Create tables
cursor.execute("""
CREATE TABLE chapters (
    id INTEGER PRIMARY KEY,
    chapter_number INTEGER,
    name TEXT,
    name_transliterated TEXT,
    name_meaning TEXT,
    name_translation TEXT,
    verses_count INTEGER,
    chapter_summary TEXT,
    chapter_summary_hindi TEXT,
    chapter_summary_gujarati TEXT,
    name_meaning_hindi TEXT,
    name_meaning_gujarati TEXT,
    image_name TEXT
);
""")

cursor.execute("""
CREATE TABLE verses (
    id INTEGER PRIMARY KEY,
    chapter_id INTEGER,
    chapter_number INTEGER,
    external_id INTEGER,
    verse_number INTEGER,
    verse_order INTEGER,
    text TEXT,
    title TEXT,
    transliteration TEXT,
    word_meanings TEXT
);
""")

cursor.execute("""
CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse_id INTEGER,
    chapter_number INTEGER,
    verse_number INTEGER,
    lang TEXT,
    description TEXT
);
""")

cursor.execute("""
CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);
""")

# 2. Insert chapters
with open(os.path.join(SRC_DIR, "chapters.json"), "r", encoding="utf-8") as f:
    chapters = json.load(f)

for ch in chapters:
    cursor.execute("""
    INSERT INTO chapters (
        id, chapter_number, name, name_transliterated, name_meaning, name_translation,
        verses_count, chapter_summary, chapter_summary_hindi, chapter_summary_gujarati,
        name_meaning_hindi, name_meaning_gujarati, image_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ch.get("id"),
        ch.get("chapter_number"),
        ch.get("name"),
        ch.get("name_transliterated"),
        ch.get("name_meaning"),
        ch.get("name_translation"),
        ch.get("verses_count"),
        ch.get("chapter_summary"),
        ch.get("chapter_summary_hindi"),
        ch.get("chapter_summary_gujarati"),
        ch.get("name_meaning_hindi"),
        ch.get("name_meaning_gujarati"),
        ch.get("image_name")
    ))

print(f"Inserted {len(chapters)} chapters.")

# 3. Insert verses
with open(os.path.join(SRC_DIR, "verse.json"), "r", encoding="utf-8") as f:
    verses = json.load(f)

for v in verses:
    cursor.execute("""
    INSERT INTO verses (
        id, chapter_id, chapter_number, external_id, verse_number, verse_order,
        text, title, transliteration, word_meanings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        v.get("id"),
        v.get("chapter_id"),
        v.get("chapter_number"),
        v.get("externalId"),
        v.get("verse_number"),
        v.get("verse_order"),
        v.get("text"),
        v.get("title"),
        v.get("transliteration"),
        v.get("word_meanings")
    ))

print(f"Inserted {len(verses)} verses.")

# 4. Insert translations from 90 chapter files
trans_count = 0
vt_files = sorted(glob.glob(os.path.join(SRC_DIR, "verse_translation", "chapter_*.json")), 
                  key=lambda p: int(os.path.basename(p).replace("chapter_", "").replace(".json", "")))

for vt_path in vt_files:
    ch_num = int(os.path.basename(vt_path).replace("chapter_", "").replace(".json", ""))
    with open(vt_path, "r", encoding="utf-8") as f:
        vt_list = json.load(f)
    
    for item in vt_list:
        v_id = item.get("verse_id") or item.get("id")
        v_num = item.get("verseNumber")
        languages = item.get("languages", {})
        
        for lang_key, lang_data in languages.items():
            desc = lang_data.get("description", "") if isinstance(lang_data, dict) else str(lang_data)
            cursor.execute("""
            INSERT INTO translations (verse_id, chapter_number, verse_number, lang, description)
            VALUES (?, ?, ?, ?, ?)
            """, (v_id, ch_num, v_num, lang_key, desc))
            trans_count += 1

print(f"Inserted {trans_count} translations from {len(vt_files)} chapter files.")

# 5. Insert timeline data into metadata
with open(os.path.join(SRC_DIR, "timeline.json"), "r", encoding="utf-8") as f:
    timeline_str = f.read()

cursor.execute("INSERT INTO metadata (key, value) VALUES ('timeline', ?)", (timeline_str,))
print("Stored timeline.json in metadata.")

# 6. Create indexes
cursor.execute("CREATE INDEX idx_verses_ch_v ON verses(chapter_number, verse_number);")
cursor.execute("CREATE INDEX idx_trans_ch ON translations(chapter_number);")
cursor.execute("CREATE INDEX idx_trans_verse_lang ON translations(verse_id, lang);")

conn.commit()

# Optimize / VACUUM
cursor.execute("VACUUM;")
conn.commit()
conn.close()

db_size_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
print(f"Successfully generated {DB_PATH} ({db_size_mb:.2f} MB)")
