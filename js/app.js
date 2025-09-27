// Global variables
let chapters = [];
let verses = [];
let translations = [];
let commentaries = [];
let authors = [];
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english' or 'hindi'
let startX = 0;
let endX = 0;

// DOM elements
const chaptersScreen = document.getElementById('chapters-screen');
const versesScreen = document.getElementById('verses-screen');
const verseDetailScreen = document.getElementById('verse-detail-screen');
const chaptersList = document.getElementById('chapters-list');
const versesList = document.getElementById('verses-list');
const chapterTitle = document.getElementById('chapter-title');
const verseText = document.getElementById('verse-text');
const verseTransliteration = document.getElementById('verse-transliteration');
const verseTranslation = document.getElementById('verse-translation');
const verseCommentary = document.getElementById('verse-commentary');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekSlider = document.getElementById('seek-slider');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const audioPlayer = document.getElementById('audio-player');
const langSwitcher = document.getElementById('lang-switcher');
const backBtn = document.getElementById('back-btn');

// Initialize app
async function init() {
    try {
        // Load data
        chapters = await fetch('./gita-main/data/chapters.json').then(r => r.json());
        verses = await fetch('./gita-main/data/verse.json').then(r => r.json());
        translations = await fetch('./gita-main/data/translation.json').then(r => r.json());
        commentaries = await fetch('./gita-main/data/commentary.json').then(r => r.json());
        authors = await fetch('./gita-main/data/authors.json').then(r => r.json());

        // Render chapters
        renderChapters();

        // Setup navigation
        setupNavigation();
        setupLangSwitcher();

        // Initially hide language switcher (only show on verse detail)
        langSwitcher.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback: show error message
        document.getElementById('main-content').innerHTML = '<p>Error loading data. Please check your connection.</p>';
    }
}

// Render chapters
function renderChapters() {
    chaptersList.innerHTML = '';
    chapters.forEach(chapter => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.innerHTML = `
            <div class="chapter-header">
                <span class="chapter-number">${chapter.chapter_number}</span>
                <h3>📖 ${chapter.name} <br/> (${chapter.name_meaning})</h3>
            </div>
            <p>${chapter.chapter_summary.substring(0, 150)}...</p>
        `;
        card.addEventListener('click', () => showChapter(chapter));
        chaptersList.appendChild(card);
    });
}

// Show chapter verses
function showChapter(chapter) {
    currentChapter = chapter;
    chapterTitle.innerHTML = `${chapter.name}<br>${chapter.name_meaning}`;
    const chapterVerses = verses.filter(v => v.chapter_number === chapter.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    versesList.innerHTML = '';
    chapterVerses.forEach(verse => {
        const item = document.createElement('div');
        item.className = 'verse-item';
        item.innerHTML = `
            <span class="verse-number">${verse.verse_number}</span>
            <div class="verse-text">${verse.text.replace(/।/, '।<br>')}</div>
        `;
        item.addEventListener('click', () => showVerse(verse));
        versesList.appendChild(item);
    });
    switchScreen(versesScreen);
    backBtn.style.display = 'block';
    document.getElementById('footer').style.display = 'block';
}

// Update verse content based on current language
function updateVerseContent() {
    if (!currentVerse) return;

    // Find translation
    const translation = translations.find(t => t.verse_id === currentVerse.id && t.lang === currentLang);
    verseTranslation.innerHTML = translation ? translation.description : 'Translation not available';

    // Find commentary
    const commentary = commentaries.find(c => c.verse_id === currentVerse.id && c.lang === currentLang);
    verseCommentary.innerHTML = commentary ? commentary.description : 'Commentary not available';
}

// Show verse detail
function showVerse(verse) {
    currentVerse = verse;
    verseText.innerHTML = verse.text.replace(/।/, '।<br>');
    verseTransliteration.innerHTML = verse.transliteration.replace(/।/, '।<br>');

    updateVerseContent();

    // Audio
    const audioSrc = `./gita-main/data/verse_recitation/${verse.chapter_number}/${verse.verse_number}.mp3`;
    audioPlayer.src = audioSrc;
    audioPlayer.load();
    audioPlayer.currentTime = 0;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    seekSlider.value = 0;
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';

    setupAudioControls();
    setupSwipeGestures();

    switchScreen(verseDetailScreen);
    document.getElementById('footer').style.display = 'none';
    document.getElementById('audio-controls').style.display = 'flex';
}

// Setup language switcher
function setupLangSwitcher() {
    langSwitcher.textContent = currentLang === 'english' ? '🇬🇧' : '🇮🇳';
    langSwitcher.addEventListener('click', () => {
        currentLang = currentLang === 'english' ? 'hindi' : 'english';
        langSwitcher.textContent = currentLang === 'english' ? '🇬🇧' : '🇮🇳';
        if (currentVerse) {
            updateVerseContent();
        }
    });
}

// Setup swipe gestures for verse navigation
function setupSwipeGestures() {
    const verseScreen = document.getElementById('verse-detail-screen');

    verseScreen.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    verseScreen.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });
}

function handleSwipe() {
    const deltaX = endX - startX;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
            // Swipe right - previous verse
            goToPreviousVerse();
        } else {
            // Swipe left - next verse
            goToNextVerse();
        }
    }
}

function goToNextVerse() {
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
    if (currentIndex < chapterVerses.length - 1) {
        showVerse(chapterVerses[currentIndex + 1]);
    }
}

function goToPreviousVerse() {
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
    if (currentIndex > 0) {
        showVerse(chapterVerses[currentIndex - 1]);
    }
}

// Setup audio controls
function setupAudioControls() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    seekSlider.addEventListener('input', seekAudio);
    audioPlayer.addEventListener('timeupdate', updateTime);
    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    });
}

function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
}

function seekAudio() {
    const seekTime = (seekSlider.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
}

function updateTime() {
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    seekSlider.value = (current / duration) * 100;
    currentTimeEl.textContent = formatTime(current);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Navigation
function setupNavigation() {
    backBtn.addEventListener('click', () => {
        if (verseDetailScreen.classList.contains('active')) {
            switchScreen(versesScreen);
            document.getElementById('footer').style.display = 'block';
            document.getElementById('audio-controls').style.display = 'none';
        } else if (versesScreen.classList.contains('active')) {
            switchScreen(chaptersScreen);
            backBtn.style.display = 'none';
        }
    });
}

function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    // Control language switcher visibility
    if (screen === verseDetailScreen) {
        langSwitcher.style.display = 'block';
    } else {
        langSwitcher.style.display = 'none';
    }
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

// Start app
init();