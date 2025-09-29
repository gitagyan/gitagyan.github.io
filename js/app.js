// Global variables
let chapters = [];
let verses = [];
let translations = [];
let currentChapter = null;
let currentVerse = null;
let currentLang = 'hindi'; // 'english', 'hindi', or 'gujarati'
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
const playPauseBtn = document.getElementById('play-pause-btn');
const seekSlider = document.getElementById('seek-slider');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const audioPlayer = document.getElementById('audio-player');
const backBtn = document.getElementById('back-btn');

// Initialize app
async function init() {
    try {
        // Load data from assets folder
        chapters = await fetch('./assets/chapters.json').then(r => r.json());
        verses = await fetch('./assets/verse.json').then(r => r.json());
        translations = await fetch('./assets/verse-translations.json').then(r => r.json());

        // Render chapters
        renderChapters();

        // Setup navigation
        setupNavigation();
        setupLangSwitcher();
        setupSwipeGestures();
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
                <div class="chapter-info">
                    <h3>${chapter.name}</h3>
                    <div class="chapter-meaning">(${chapter.name_meaning})</div>
                    <div class="chapter-stats">
                        <span class="verse-count">${chapter.verses_count} श्लोक</span>
                    </div>
                </div>
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
    chapterTitle.innerHTML = `
        <div class="chapter-title-name">${chapter.name}</div>
        <div class="chapter-title-meaning">(${chapter.name_meaning})</div>
    `;
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

    // Find translation for current verse
    const translation = translations.find(t => t.verse_id === currentVerse.id);
    
    if (translation && translation.languages && translation.languages[currentLang]) {
        verseTranslation.innerHTML = translation.languages[currentLang].description;
    } else {
        verseTranslation.innerHTML = 'Translation not available';
    }
}

// Show verse detail
function showVerse(verse) {
    currentVerse = verse;
    
    // Update Sanskrit card with sloka number pill
    const sanskritCard = document.getElementById('verse-sanskrit-card');
    sanskritCard.innerHTML = `
        <div class="sloka-number-pill">श्लोक ${verse.verse_number}</div>
        <div id="verse-text">${verse.text.replace(/।/, '।<br>')}</div>
        <div id="verse-transliteration">${verse.transliteration.replace(/।/, '।<br>')}</div>
    `;
    
    // Update verse elements references since we recreated the content
    const verseText = document.getElementById('verse-text');
    const verseTransliteration = document.getElementById('verse-transliteration');

    updateVerseContent();

    // Audio - using assets folder structure
    const audioSrc = `./assets/verse_recitation/${verse.chapter_number}/${verse.verse_number}.mp3`;
    audioPlayer.src = audioSrc;
    audioPlayer.load();
    audioPlayer.currentTime = 0;
    
    // Update floating button
    const floatingBtn = document.getElementById('floating-play-pause');
    const floatingTime = document.getElementById('floating-time');
    const progressCircle = document.querySelector('.progress-ring-circle');
    
    floatingBtn.innerHTML = '<i class="fas fa-play"></i>';
    floatingTime.textContent = '0:00';
    progressCircle.style.strokeDashoffset = 138.23;

    setupFloatingAudioControls();
    setupVerseNavigation();
    setupLanguagePills();

    switchScreen(verseDetailScreen);
    document.getElementById('footer').style.display = 'none';
    document.getElementById('floating-audio-btn').style.display = 'block';
    document.getElementById('verse-navigation').style.display = 'flex';
}

// Setup verse navigation
function setupVerseNavigation() {
    if (!currentVerse || !currentChapter) return;
    
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
    
    // Update slider and counter
    const verseSlider = document.getElementById('verse-slider');
    const verseCounter = document.getElementById('verse-counter');
    const prevBtn = document.getElementById('prev-verse-btn');
    const nextBtn = document.getElementById('next-verse-btn');
    
    verseSlider.max = chapterVerses.length;
    verseSlider.value = currentIndex + 1;
    verseCounter.textContent = `${currentIndex + 1}/${chapterVerses.length}`;
    
    // Update button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === chapterVerses.length - 1;
    
    // Remove existing listeners
    prevBtn.removeEventListener('click', handlePrevVerse);
    nextBtn.removeEventListener('click', handleNextVerse);
    verseSlider.removeEventListener('input', handleVerseSliderChange);
    
    // Add new listeners
    prevBtn.addEventListener('click', handlePrevVerse);
    nextBtn.addEventListener('click', handleNextVerse);
    verseSlider.addEventListener('input', handleVerseSliderChange);
}

function handlePrevVerse() {
    goToPreviousVerse();
}

function handleNextVerse() {
    goToNextVerse();
}

function handleVerseSliderChange(e) {
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const selectedIndex = parseInt(e.target.value) - 1;
    
    if (selectedIndex >= 0 && selectedIndex < chapterVerses.length) {
        showVerse(chapterVerses[selectedIndex]);
    }
}

// Setup language pills
function setupLanguagePills() {
    const hindiPill = document.getElementById('hindi-pill');
    const englishPill = document.getElementById('english-pill');
    const gujaratiPill = document.getElementById('gujarati-pill');
    
    // Update active state based on current language
    updatePillsActiveState();
    
    // Remove existing listeners
    hindiPill.removeEventListener('click', switchToHindi);
    englishPill.removeEventListener('click', switchToEnglish);
    gujaratiPill.removeEventListener('click', switchToGujarati);
    
    // Add new listeners
    hindiPill.addEventListener('click', switchToHindi);
    englishPill.addEventListener('click', switchToEnglish);
    gujaratiPill.addEventListener('click', switchToGujarati);
}

function switchToHindi() {
    if (currentLang !== 'hindi') {
        currentLang = 'hindi';
        updatePillsActiveState();
        if (currentVerse) {
            updateVerseContent();
        }
    }
}

function switchToEnglish() {
    if (currentLang !== 'english') {
        currentLang = 'english';
        updatePillsActiveState();
        if (currentVerse) {
            updateVerseContent();
        }
    }
}

function switchToGujarati() {
    if (currentLang !== 'gujarati') {
        currentLang = 'gujarati';
        updatePillsActiveState();
        if (currentVerse) {
            updateVerseContent();
        }
    }
}

function updatePillsActiveState() {
    const hindiPill = document.getElementById('hindi-pill');
    const englishPill = document.getElementById('english-pill');
    const gujaratiPill = document.getElementById('gujarati-pill');
    
    // Remove active class from all pills
    hindiPill.classList.remove('active');
    englishPill.classList.remove('active');
    gujaratiPill.classList.remove('active');
    
    // Add active class to current language pill
    if (currentLang === 'hindi') {
        hindiPill.classList.add('active');
    } else if (currentLang === 'english') {
        englishPill.classList.add('active');
    } else if (currentLang === 'gujarati') {
        gujaratiPill.classList.add('active');
    }
}

// Setup language switcher (legacy - keeping for compatibility)
function setupLangSwitcher() {
    // This function is now handled by setupLanguagePills
    return;
}

// Setup swipe gestures for verse navigation
function setupSwipeGestures() {
    const verseScreen = document.getElementById('verse-detail-screen');
    
    // Remove existing listeners to prevent duplicates
    verseScreen.removeEventListener('touchstart', handleTouchStart);
    verseScreen.removeEventListener('touchend', handleTouchEnd);
    
    // Add new listeners
    verseScreen.addEventListener('touchstart', handleTouchStart);
    verseScreen.addEventListener('touchend', handleTouchEnd);
}

function handleTouchStart(e) {
    startX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
}

function handleSwipe() {
    if (!currentVerse) {
        console.log('No current verse set');
        return;
    }
    
    const deltaX = endX - startX;
    const threshold = 50; // Minimum swipe distance
    
    console.log('Swipe detected:', { deltaX, startX, endX, threshold });

    if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
            // Swipe right - previous verse
            console.log('Swipe right - going to previous verse');
            goToPreviousVerse();
        } else {
            // Swipe left - next verse
            console.log('Swipe left - going to next verse');
            goToNextVerse();
        }
    }
}

function goToNextVerse() {
    if (!currentVerse) {
        console.log('No current verse for next navigation');
        return;
    }
    
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
    
    console.log('Next verse navigation:', { 
        currentVerseId: currentVerse.id, 
        currentIndex, 
        totalVerses: chapterVerses.length 
    });
    
    if (currentIndex >= 0 && currentIndex < chapterVerses.length - 1) {
        showVerse(chapterVerses[currentIndex + 1]);
    } else {
        console.log('Already at last verse or verse not found');
    }
}

function goToPreviousVerse() {
    if (!currentVerse) {
        console.log('No current verse for previous navigation');
        return;
    }
    
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
    
    console.log('Previous verse navigation:', { 
        currentVerseId: currentVerse.id, 
        currentIndex, 
        totalVerses: chapterVerses.length 
    });
    
    if (currentIndex > 0) {
        showVerse(chapterVerses[currentIndex - 1]);
    } else {
        console.log('Already at first verse');
    }
}

// Setup floating audio controls
function setupFloatingAudioControls() {
    const floatingBtn = document.getElementById('floating-play-pause');
    const floatingTime = document.getElementById('floating-time');
    const progressCircle = document.querySelector('.progress-ring-circle');
    
    // Remove existing listeners to prevent duplicates
    floatingBtn.removeEventListener('click', toggleFloatingPlayPause);
    audioPlayer.removeEventListener('timeupdate', updateFloatingTime);
    audioPlayer.removeEventListener('loadedmetadata', updateFloatingDuration);
    audioPlayer.removeEventListener('ended', resetFloatingButton);
    
    // Add new listeners
    floatingBtn.addEventListener('click', toggleFloatingPlayPause);
    audioPlayer.addEventListener('timeupdate', updateFloatingTime);
    audioPlayer.addEventListener('loadedmetadata', updateFloatingDuration);
    audioPlayer.addEventListener('ended', resetFloatingButton);
}

function toggleFloatingPlayPause() {
    const floatingBtn = document.getElementById('floating-play-pause');
    if (audioPlayer.paused) {
        audioPlayer.play();
        floatingBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audioPlayer.pause();
        floatingBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function updateFloatingTime() {
    const floatingTime = document.getElementById('floating-time');
    const progressCircle = document.querySelector('.progress-ring-circle');
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (duration) {
        const remaining = duration - current;
        floatingTime.textContent = formatTime(remaining);
        
        // Update progress ring
        const circumference = 138.23;
        const progress = current / duration;
        const offset = circumference - (progress * circumference);
        progressCircle.style.strokeDashoffset = offset;
    }
}

function updateFloatingDuration() {
    // Initial setup when audio metadata loads
    const floatingTime = document.getElementById('floating-time');
    floatingTime.textContent = formatTime(audioPlayer.duration);
}

function resetFloatingButton() {
    const floatingBtn = document.getElementById('floating-play-pause');
    const floatingTime = document.getElementById('floating-time');
    const progressCircle = document.querySelector('.progress-ring-circle');
    
    floatingBtn.innerHTML = '<i class="fas fa-play"></i>';
    floatingTime.textContent = formatTime(audioPlayer.duration);
    progressCircle.style.strokeDashoffset = 138.23;
    
    // Auto-play next verse feature
    if (currentVerse) {
        const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
        const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);
        
        // If there's a next verse, move to it and start playing
        if (currentIndex >= 0 && currentIndex < chapterVerses.length - 1) {
            setTimeout(() => {
                showVerse(chapterVerses[currentIndex + 1]);
                // Start playing after a short delay to ensure audio is loaded
                setTimeout(() => {
                    audioPlayer.play().then(() => {
                        const newFloatingBtn = document.getElementById('floating-play-pause');
                        newFloatingBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    }).catch(error => {
                        console.log('Auto-play failed:', error);
                    });
                }, 500);
            }, 100);
        }
    }
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
            document.getElementById('floating-audio-btn').style.display = 'none';
            document.getElementById('verse-navigation').style.display = 'none';
        } else if (versesScreen.classList.contains('active')) {
            switchScreen(chaptersScreen);
            backBtn.style.display = 'none';
        }
    });
}

function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
    
    // Language pills are now handled within the verse detail screen itself
    // No need to control visibility here
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