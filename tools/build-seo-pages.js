#!/usr/bin/env node
/*
 * Generates static, crawlable HTML pages for every chapter and verse of the
 * Bhagavad Gita in English and Hindi, plus sitemap.xml.
 *
 * Output (relative to repo root):
 *   /chapter-{c}/index.html             English chapter page
 *   /chapter-{c}/verse-{v}/index.html   English verse page
 *   /hi/chapter-{c}/index.html          Hindi chapter page
 *   /hi/chapter-{c}/verse-{v}/index.html Hindi verse page
 *   /sitemap.xml
 *
 * Usage: node tools/build-seo-pages.js
 * Re-run whenever assets/verse.json, assets/chapters.json, or
 * assets/verse_translation/*.json change, then commit the output.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://gitagyan.in';

const chapters = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/chapters.json')));
const verses = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/verse.json')));
const translationsByVerseId = {};
for (let c = 1; c <= 18; c++) {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/verse_translation/chapter_${c}.json`)));
    for (const entry of t) translationsByVerseId[entry.verse_id] = entry;
}

verses.sort((a, b) => a.chapter_number - b.chapter_number || a.verse_number - b.verse_number);
const chapterByNumber = {};
for (const ch of chapters) chapterByNumber[ch.chapter_number] = ch;

// ---------- helpers ----------

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Strip trailing verse markers like ।।1.1।। and tidy whitespace (mirrors app.js cleanVerseText, but keeps newlines)
function cleanSanskrit(text) {
    return String(text || '')
        .trim()
        .replace(/[।॥]+\s*\d+\.\d+\s*[।॥]+\s*$/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

function truncate(s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

const STRINGS = {
    en: {
        langCode: 'en',
        htmlLang: 'en',
        home: 'Home',
        chapterWord: 'Chapter',
        verseWord: 'Verse',
        chapterLabel: (c) => `Chapter ${c}`,
        verseLabel: (c, v) => `Chapter ${c}, Verse ${v}`,
        shortRef: (c, v) => `Bhagavad Gita ${c}.${v}`,
        sanskritHeading: 'Sanskrit Shloka',
        translitHeading: 'Transliteration',
        wordMeaningsHeading: 'Word Meanings',
        translationHeading: 'Translation',
        commentaryHeading: 'Meaning & Commentary',
        versesHeading: 'Verses',
        summaryHeading: 'Chapter Summary',
        prev: '← Previous verse',
        next: 'Next verse →',
        openInApp: 'Read in the app (audio, bookmarks & more)',
        allChapters: 'All 18 chapters',
        readInOtherLang: 'इस श्लोक को हिंदी में पढ़ें',
        siteTagline: 'Complete Bhagavad Gita — free, no ads, works offline',
        bookName: 'Bhagavad Gita',
        chaptersIntro: (n) => `${n} verses`,
    },
    hi: {
        langCode: 'hi',
        htmlLang: 'hi',
        home: 'मुखपृष्ठ',
        chapterWord: 'अध्याय',
        verseWord: 'श्लोक',
        chapterLabel: (c) => `अध्याय ${c}`,
        verseLabel: (c, v) => `अध्याय ${c}, श्लोक ${v}`,
        shortRef: (c, v) => `भगवद् गीता ${c}.${v}`,
        sanskritHeading: 'संस्कृत श्लोक',
        translitHeading: 'लिप्यंतरण',
        wordMeaningsHeading: 'शब्दार्थ',
        translationHeading: 'अनुवाद',
        commentaryHeading: 'अर्थ एवं व्याख्या',
        versesHeading: 'श्लोक',
        summaryHeading: 'अध्याय सारांश',
        prev: '← पिछला श्लोक',
        next: 'अगला श्लोक →',
        openInApp: 'ऐप में पढ़ें (ऑडियो, बुकमार्क और अधिक)',
        allChapters: 'सभी 18 अध्याय',
        readInOtherLang: 'Read this verse in English',
        siteTagline: 'सम्पूर्ण भगवद् गीता — निःशुल्क, बिना विज्ञापन, ऑफ़लाइन उपलब्ध',
        bookName: 'भगवद् गीता',
        chaptersIntro: (n) => `${n} श्लोक`,
    },
};

const urls = {
    chapter: (lang, c) => (lang === 'hi' ? `/hi/chapter-${c}/` : `/chapter-${c}/`),
    verse: (lang, c, v) => (lang === 'hi' ? `/hi/chapter-${c}/verse-${v}/` : `/chapter-${c}/verse-${v}/`),
};

function chapterTitle(lang, ch) {
    return lang === 'hi'
        ? `${ch.name}`
        : `${ch.name_transliterated} – ${ch.name_meaning}`;
}

function hreflangLinks(enPath, hiPath) {
    return [
        `<link rel="alternate" hreflang="en" href="${SITE}${enPath}">`,
        `<link rel="alternate" hreflang="hi" href="${SITE}${hiPath}">`,
        `<link rel="alternate" hreflang="x-default" href="${SITE}${enPath}">`,
    ].join('\n    ');
}

function breadcrumbJsonLd(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: SITE + it.path,
        })),
    };
}

function pageShell({ lang, title, description, canonicalPath, enPath, hiPath, jsonLd, body }) {
    const S = STRINGS[lang];
    return `<!DOCTYPE html>
<html lang="${S.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${SITE}${canonicalPath}">
    ${hreflangLinks(enPath, hiPath)}
    <meta property="og:type" content="article">
    <meta property="og:url" content="${SITE}${canonicalPath}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${SITE}/images/icon-512.png">
    <meta property="og:site_name" content="GitaGyan">
    <meta property="og:locale" content="${lang === 'hi' ? 'hi_IN' : 'en_US'}">
    <meta name="twitter:card" content="summary">
    <meta name="theme-color" content="#E6A623">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/css/static.css">
${jsonLd.map((o) => `    <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
    <header class="site-header">
        <a href="/"><img src="/images/navbar-logo.png" alt="GitaGyan — Bhagavad Gita" height="48"></a>
    </header>
    <main>
${body}
    </main>
    <footer class="site-footer">
        <p>🙏 सर्वधर्मान् परित्यज्य मामेकं शरणं व्रज 🙏</p>
        <p><a href="/">${esc(S.siteTagline)}</a></p>
    </footer>
</body>
</html>
`;
}

// ---------- verse pages ----------

function versePage(lang, verse, prev, next) {
    const S = STRINGS[lang];
    const c = verse.chapter_number;
    const v = verse.verse_number;
    const ch = chapterByNumber[c];
    const tr = translationsByVerseId[verse.id];
    const langData = tr?.languages?.[lang === 'hi' ? 'hindi' : 'english'] || {};
    const translation = (langData.description || '').trim();
    const commentary = (langData.meaning || '').trim();

    const enPath = urls.verse('en', c, v);
    const hiPath = urls.verse('hi', c, v);
    const canonicalPath = lang === 'hi' ? hiPath : enPath;

    const sanskrit = cleanSanskrit(verse.text);
    const translit = String(verse.transliteration || '').trim();
    const wordMeanings = String(verse.word_meanings || '').trim();

    const title = lang === 'hi'
        ? `भगवद् गीता अध्याय ${c} श्लोक ${v} – अर्थ सहित | GitaGyan`
        : `Bhagavad Gita Chapter ${c} Verse ${v} – Sanskrit, Translation & Meaning | GitaGyan`;
    const description = truncate(
        lang === 'hi'
            ? `भगवद् गीता ${c}.${v}: ${translation}`
            : `Bhagavad Gita ${c}.${v}: ${translation}`,
        158
    );

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: lang === 'hi' ? `भगवद् गीता ${c}.${v}` : `Bhagavad Gita ${c}.${v}`,
            inLanguage: lang,
            description,
            url: SITE + canonicalPath,
            isPartOf: { '@type': 'Book', '@id': `${SITE}/#book`, name: 'Bhagavad Gita' },
            author: { '@type': 'Person', name: 'Vyasa' },
            publisher: { '@type': 'Organization', name: 'GitaGyan', url: SITE },
        },
        breadcrumbJsonLd([
            { name: S.home, path: '/' },
            { name: `${S.chapterLabel(c)}: ${chapterTitle(lang, ch)}`, path: urls.chapter(lang, c) },
            { name: `${S.verseWord} ${v}`, path: canonicalPath },
        ]),
    ];

    const nav = [
        prev ? `<a rel="prev" href="${urls.verse(lang, prev.chapter_number, prev.verse_number)}">${esc(S.prev)}</a>` : '<span></span>',
        next ? `<a rel="next" href="${urls.verse(lang, next.chapter_number, next.verse_number)}">${esc(S.next)}</a>` : '<span></span>',
    ].join('\n            ');

    const body = `        <nav class="breadcrumbs">
            <a href="/">${esc(S.home)}</a> ›
            <a href="${urls.chapter(lang, c)}">${esc(S.chapterLabel(c))}</a> ›
            <span>${esc(S.verseWord)} ${v}</span>
        </nav>
        <article>
            <h1>${esc(S.verseLabel(c, v))} <span class="ref">(${esc(S.shortRef(c, v))})</span></h1>
            <p class="chapter-name"><a href="${urls.chapter(lang, c)}">${esc(S.chapterLabel(c))}: ${esc(chapterTitle(lang, ch))}</a></p>
            <section class="sanskrit">
                <h2>${esc(S.sanskritHeading)}</h2>
                <p class="shloka">${esc(sanskrit)}</p>
            </section>
            <section class="translit">
                <h2>${esc(S.translitHeading)}</h2>
                <p class="pre">${esc(translit)}</p>
            </section>
${wordMeanings ? `            <section class="word-meanings">
                <h2>${esc(S.wordMeaningsHeading)}</h2>
                <p>${esc(wordMeanings)}</p>
            </section>\n` : ''}${translation ? `            <section class="translation">
                <h2>${esc(S.translationHeading)}</h2>
                <p>${esc(translation)}</p>
            </section>\n` : ''}${commentary ? `            <section class="commentary">
                <h2>${esc(S.commentaryHeading)}</h2>
                <p>${esc(commentary)}</p>
            </section>\n` : ''}            <p class="lang-switch"><a href="${lang === 'hi' ? enPath : hiPath}">${esc(S.readInOtherLang)}</a></p>
            <p class="app-link"><a class="btn" href="/?c=${c}&amp;v=${v}">${esc(S.openInApp)}</a></p>
            <nav class="pager">
            ${nav}
            </nav>
        </article>`;

    return pageShell({ lang, title, description, canonicalPath, enPath, hiPath, jsonLd, body });
}

// ---------- chapter pages ----------

function chapterPage(lang, ch, chapterVerses) {
    const S = STRINGS[lang];
    const c = ch.chapter_number;
    const enPath = urls.chapter('en', c);
    const hiPath = urls.chapter('hi', c);
    const canonicalPath = lang === 'hi' ? hiPath : enPath;
    const summary = (lang === 'hi' ? ch.chapter_summary_hindi : ch.chapter_summary) || '';

    const title = lang === 'hi'
        ? `भगवद् गीता अध्याय ${c}: ${ch.name} – सभी ${ch.verses_count} श्लोक अर्थ सहित | GitaGyan`
        : `Bhagavad Gita Chapter ${c}: ${ch.name_transliterated} (${ch.name_meaning}) – All ${ch.verses_count} Verses | GitaGyan`;
    const description = truncate(summary, 158);

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'Chapter',
            name: lang === 'hi' ? `अध्याय ${c}: ${ch.name}` : `Chapter ${c}: ${ch.name_transliterated} – ${ch.name_meaning}`,
            position: c,
            inLanguage: lang,
            description,
            url: SITE + canonicalPath,
            isPartOf: { '@type': 'Book', '@id': `${SITE}/#book`, name: 'Bhagavad Gita' },
        },
        breadcrumbJsonLd([
            { name: S.home, path: '/' },
            { name: `${S.chapterLabel(c)}: ${chapterTitle(lang, ch)}`, path: canonicalPath },
        ]),
    ];

    const verseItems = chapterVerses.map((verse) => {
        const tr = translationsByVerseId[verse.id];
        const langData = tr?.languages?.[lang === 'hi' ? 'hindi' : 'english'] || {};
        const snippet = truncate(langData.description || '', 110);
        return `                <li><a href="${urls.verse(lang, c, verse.verse_number)}"><strong>${esc(`${c}.${verse.verse_number}`)}</strong> — ${esc(snippet)}</a></li>`;
    }).join('\n');

    const prevCh = chapterByNumber[c - 1];
    const nextCh = chapterByNumber[c + 1];
    const pager = [
        prevCh ? `<a rel="prev" href="${urls.chapter(lang, c - 1)}">← ${esc(S.chapterLabel(c - 1))}</a>` : '<span></span>',
        nextCh ? `<a rel="next" href="${urls.chapter(lang, c + 1)}">${esc(S.chapterLabel(c + 1))} →</a>` : '<span></span>',
    ].join('\n            ');

    const body = `        <nav class="breadcrumbs">
            <a href="/">${esc(S.home)}</a> ›
            <span>${esc(S.chapterLabel(c))}</span>
        </nav>
        <article>
            <h1>${esc(S.chapterLabel(c))}: ${esc(chapterTitle(lang, ch))}</h1>
            <p class="chapter-name">${esc(ch.name)}${lang === 'hi' ? ` (${esc(ch.name_transliterated)})` : ''} · ${esc(S.chaptersIntro(ch.verses_count))}</p>
            <section class="summary">
                <h2>${esc(S.summaryHeading)}</h2>
                <p class="pre">${esc(summary.trim())}</p>
            </section>
            <section class="verse-list">
                <h2>${esc(S.versesHeading)}</h2>
                <ol>
${verseItems}
                </ol>
            </section>
            <p class="lang-switch"><a href="${lang === 'hi' ? enPath : hiPath}">${esc(S.readInOtherLang)}</a></p>
            <p class="app-link"><a class="btn" href="/?c=${c}&amp;v=1">${esc(S.openInApp)}</a></p>
            <nav class="pager">
            ${pager}
            </nav>
        </article>`;

    return pageShell({ lang, title, description, canonicalPath, enPath, hiPath, jsonLd, body });
}

// ---------- sitemap ----------

function sitemapEntry(enPath, hiPath, priority) {
    const alt = `
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${enPath}"/>
    <xhtml:link rel="alternate" hreflang="hi" href="${SITE}${hiPath}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${enPath}"/>`;
    return [enPath, hiPath].map((p) => `  <url>
    <loc>${SITE}${p}</loc>${alt}
    <priority>${priority}</priority>
  </url>`).join('\n');
}

// ---------- main ----------

function writePage(relPath, html) {
    const outFile = path.join(ROOT, relPath.replace(/^\//, ''), 'index.html');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
}

let pageCount = 0;
const sitemapEntries = [`  <url>
    <loc>${SITE}/</loc>
    <priority>1.0</priority>
  </url>`];

for (const ch of chapters) {
    const c = ch.chapter_number;
    const chapterVerses = verses.filter((verse) => verse.chapter_number === c);
    for (const lang of ['en', 'hi']) {
        writePage(urls.chapter(lang, c), chapterPage(lang, ch, chapterVerses));
        pageCount++;
    }
    sitemapEntries.push(sitemapEntry(urls.chapter('en', c), urls.chapter('hi', c), '0.8'));
}

for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    const prev = verses[i - 1] || null;
    const next = verses[i + 1] || null;
    for (const lang of ['en', 'hi']) {
        writePage(urls.verse(lang, verse.chapter_number, verse.verse_number), versePage(lang, verse, prev, next));
        pageCount++;
    }
    sitemapEntries.push(sitemapEntry(
        urls.verse('en', verse.chapter_number, verse.verse_number),
        urls.verse('hi', verse.chapter_number, verse.verse_number),
        '0.7'
    ));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`Generated ${pageCount} pages + sitemap.xml (${sitemapEntries.length * 1} url blocks)`);
