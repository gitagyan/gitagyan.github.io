// Global variables
let chapters = [];
let verses = [];
let translations = {}; // Changed from array to object: {chapterNumber: [translations]}
let youtubeVideos = []; // YouTube videos for chapters
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english', 'hindi', or 'gujarati' - for verse translations
let currentTab = 'translation'; // 'translation' or 'explanation'
let startX = 0;
let endX = 0;
let previousScreen = null; // Track where user came from

// DOM elements
const chaptersScreen = document.getElementById('chapters-screen');
const versesScreen = document.getElementById('verses-screen');
const verseDetailScreen = document.getElementById('verse-detail-screen');
const settingsScreen = document.getElementById('settings-screen');
const bookmarksScreen = document.getElementById('bookmarks-screen');
const chaptersList = document.getElementById('chapters-list');
const versesList = document.getElementById('verses-list');
const chapterTitle = document.getElementById('chapter-title');
const audioPlayer = document.getElementById('audio-player');
const backBtn = document.getElementById('back-btn');
const mainFloatingBtn = document.getElementById('main-floating-btn');
const floatingMenu = document.getElementById('floating-menu');
let bookmarkBtn = document.getElementById('bookmark-btn');

// PWA Install component setup


// Global variables for share card generation
let preGeneratedShareBlob = null;
let isGeneratingShareImage = false;
let shareBgImage = null;

// Initialize app
async function init() {
    try {
        // Preload the share background image immediately
        shareBgImage = new Image();
        shareBgImage.src = './images/krishna-and-arjuna.jpg';

        // Load data from assets folder
        chapters = await fetch('./assets/chapters.json').then(r => r.json());
        verses = await fetch('./assets/verse.json').then(r => r.json());

        // Make chapters and verses data available globally for Sarthi AI
        window.chaptersData = chapters;
        window.versesData = verses;

        // Load all chapter translation files
        translations = {};
        const translationPromises = [];
        for (let chapterNum = 1; chapterNum <= 18; chapterNum++) {
            translationPromises.push(
                fetch(`./assets/verse_translation/chapter_${chapterNum}.json`)
                    .then(r => r.json())
                    .then(data => {
                        translations[chapterNum] = data;
                    })
                    .catch(error => {
                        console.warn(`Failed to load translations for chapter ${chapterNum}:`, error);
                        translations[chapterNum] = []; // Empty array as fallback
                    })
            );
        }
        await Promise.all(translationPromises);

        // Load YouTube videos data
        try {
            youtubeVideos = await fetch('./assets/youtube_videos.json').then(r => r.json());
        } catch (error) {
            console.warn('Failed to load YouTube videos:', error);
            youtubeVideos = [];
        }

        // Load saved translation language preference
        const savedTranslationLang = localStorage.getItem('translationLanguage');
        if (savedTranslationLang) {
            currentLang = savedTranslationLang;
        }

        // Setup Translation & Explain tabs
        setupTabs();

        // Initialize settings
        initSettings();

        // Initialize floating menu
        initFloatingMenu();

        // Initialize Share Sheet Modal
        initShareSheet();

        // Render chapters
        renderChapters();

        // Setup navigation
        setupNavigation();
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

    // Load YouTube videos for this chapter (Hindi and English)
    const videoContainer = document.getElementById('chapter-video-container');
    const hindiIframe = document.getElementById('chapter-video-iframe-hindi');
    const englishIframe = document.getElementById('chapter-video-iframe-english');

    if (youtubeVideos && youtubeVideos.length > 0) {
        // Find video data for current chapter
        const chapterVideo = youtubeVideos.find(v => v.chapter === chapter.chapter_number);

        if (chapterVideo && chapterVideo.hindi && chapterVideo.english) {
            // Clear iframe srcs first to force a clean reload
            hindiIframe.src = '';
            englishIframe.src = '';

            // Set new videos with a small delay to ensure clean load
            setTimeout(() => {
                const originParam = `&origin=${encodeURIComponent(window.location.origin)}`;
                hindiIframe.src = `https://www.youtube.com/embed/${chapterVideo.hindi.video_id}?playsinline=1&rel=0${originParam}`;
                englishIframe.src = `https://www.youtube.com/embed/${chapterVideo.english.video_id}?playsinline=1&rel=0${originParam}`;
            }, 100);

            videoContainer.style.display = 'block';

            // Reset tabs to English (default)
            resetVideoTabs();

            // Setup tab click handlers
            setupVideoTabs();
        } else {
            hindiIframe.src = '';
            englishIframe.src = '';
            videoContainer.style.display = 'none';
        }
    } else {
        hindiIframe.src = '';
        englishIframe.src = '';
        videoContainer.style.display = 'none';
    }

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

    // Scroll to top of verses list
    setTimeout(() => {
        const main = document.querySelector('main');
        if (main) {
            main.scrollTop = 0;
        }
    }, 0);
}

// Update verse content based on current language
function updateVerseContent() {
    if (!currentVerse) return;

    const verseTranslation = document.getElementById('verse-translation');

    // Find translation for current verse from the appropriate chapter
    const chapterTranslations = translations[currentVerse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === currentVerse.id);

    if (translation && translation.languages && translation.languages[currentLang]) {
        if (currentTab === 'translation') {
            verseTranslation.innerHTML = translation.languages[currentLang].description || 'Translation not available';
        } else {
            const meaning = translation.languages[currentLang].meaning;
            if (meaning) {
                verseTranslation.innerHTML = meaning;
            } else {
                verseTranslation.innerHTML = 'Explanation not available in this language.';
            }
        }
    } else {
        verseTranslation.innerHTML = 'Translation not available';
    }

    // Restore floating audio button opacity when showing normal translation
    const floatingAudioBtn = document.getElementById('floating-audio-btn');
    if (floatingAudioBtn) {
        floatingAudioBtn.style.opacity = '1';
    }
}

// Show verse detail
function showVerse(verse) {
    currentVerse = verse;
    window.currentVerse = verse;

    // Update Sanskrit card with sloka number pill
    const sanskritCard = document.getElementById('verse-sanskrit-card');
    sanskritCard.innerHTML = `
        <div class="sanskrit-card-header">
            <button id="bookmark-btn" class="bookmark-btn" title="Add bookmark">
                <i class="far fa-heart"></i>
            </button>
            <div class="sloka-number-pill">श्लोक ${verse.chapter_number}.${verse.verse_number}</div>
            <button id="share-btn" class="share-btn" title="Share verse">
                <i class="fas fa-share-nodes"></i>
            </button>
        </div>
        <div id="verse-text">${cleanVerseText(verse.text)}</div>
        <div id="verse-transliteration">${cleanVerseText(verse.transliteration)}</div>
    `;

    bookmarkBtn = document.getElementById('bookmark-btn');

    updateTabsUI();
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
    progressCircle.style.strokeDashoffset = 182.21;

    setupFloatingAudioControls();
    setupVerseNavigation();
    setupLanguagePills();
    setupBookmarkButton();
    setupShareButton();

    switchScreen(verseDetailScreen);
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

// Setup language dropdown
function setupLanguagePills() {
    const languageDropdown = document.getElementById('language-dropdown');

    if (languageDropdown) {
        // Set current language in dropdown
        languageDropdown.value = currentLang;

        // Remove existing listener
        languageDropdown.removeEventListener('change', handleLanguageChange);

        // Add new listener
        languageDropdown.addEventListener('change', handleLanguageChange);
    }
}

function handleLanguageChange(e) {
    const newLang = e.target.value;
    if (currentLang !== newLang) {
        currentLang = newLang;
        // Save translation language preference
        localStorage.setItem('translationLanguage', newLang);
        if (currentVerse) {
            updateVerseContent();
        }
    }
}

// Setup bookmark button
function setupBookmarkButton() {
    updateBookmarkButton();

    // Remove existing listener
    bookmarkBtn.removeEventListener('click', handleBookmarkClick);

    // Add new listener
    bookmarkBtn.addEventListener('click', handleBookmarkClick);
}

function handleBookmarkClick() {
    if (!currentVerse) return;

    if (isBookmarked(currentVerse.id)) {
        removeBookmark(currentVerse.id);
    } else {
        addBookmark(currentVerse);
    }
}

// Setup swipe gestures for verse navigation and global navigation
function setupSwipeGestures() {
    // Setup global swipe gestures on body
    setupGlobalSwipeGestures();

    // Setup verse-specific swipe gestures
    const verseScreen = document.getElementById('verse-detail-screen');

    // Remove existing listeners to prevent duplicates
    verseScreen.removeEventListener('touchstart', handleTouchStart);
    verseScreen.removeEventListener('touchend', handleTouchEnd);

    // Add new listeners
    verseScreen.addEventListener('touchstart', handleTouchStart);
    verseScreen.addEventListener('touchend', handleTouchEnd);
}

// Global swipe gestures for screen navigation
function setupGlobalSwipeGestures() {
    const body = document.body;

    // Remove existing listeners to prevent duplicates
    body.removeEventListener('touchstart', handleGlobalTouchStart);
    body.removeEventListener('touchend', handleGlobalTouchEnd);

    // Add global swipe listeners
    body.addEventListener('touchstart', handleGlobalTouchStart);
    body.addEventListener('touchend', handleGlobalTouchEnd);
}

let globalStartX = 0;
let globalEndX = 0;

function handleGlobalTouchStart(e) {
    globalStartX = e.touches[0].clientX;
}

function handleGlobalTouchEnd(e) {
    globalEndX = e.changedTouches[0].clientX;
    handleGlobalSwipe();
}

function handleGlobalSwipe() {
    const deltaX = globalEndX - globalStartX;
    const threshold = 100; // Larger threshold for screen navigation
    const screenWidth = window.innerWidth;
    const edgeThreshold = screenWidth * 0.1; // 10% of screen width from edge

    // Only trigger if swipe starts from left edge and is a right swipe
    if (globalStartX <= edgeThreshold && deltaX > threshold) {
        goToPreviousScreen();
    }
}

function goToPreviousScreen() {
    const currentActiveScreen = document.querySelector('.screen.active');

    if (!currentActiveScreen) return;

    // Determine which screen to go back to
    if (currentActiveScreen === verseDetailScreen) {
        switchScreen(versesScreen);
    } else if (currentActiveScreen === versesScreen) {
        switchScreen(chaptersScreen);
        backBtn.style.display = 'none';
    } else if (currentActiveScreen === settingsScreen || currentActiveScreen === bookmarksScreen) {
        switchScreen(chaptersScreen);
        backBtn.style.display = 'none';
    }
}

function handleTouchStart(e) {
    startX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    endX = e.changedTouches[0].clientX;
    // Only handle verse navigation if we're on verse detail screen
    if (document.getElementById('verse-detail-screen').classList.contains('active')) {
        handleVerseSwipe();
    }
}

function handleVerseSwipe() {
    if (!currentVerse) return;

    const deltaX = endX - startX;
    const threshold = 50; // Minimum swipe distance for verse navigation
    const screenWidth = window.innerWidth;
    const edgeThreshold = screenWidth * 0.1; // 10% of screen width from edge

    // Don't handle verse navigation if swipe starts from left edge (reserved for screen navigation)
    if (startX <= edgeThreshold) {
        return;
    }

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
    if (!currentVerse) return;

    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

    if (currentIndex >= 0 && currentIndex < chapterVerses.length - 1) {
        showVerse(chapterVerses[currentIndex + 1]);
    }
}

function goToPreviousVerse() {
    if (!currentVerse) return;

    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

    if (currentIndex > 0) {
        showVerse(chapterVerses[currentIndex - 1]);
    }
}

// Setup floating audio controls
function setupFloatingAudioControls() {
    const floatingBtn = document.getElementById('floating-play-pause');

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
        // Use play() with proper error handling for iOS
        audioPlayer.play().catch(error => {
            console.warn('Audio play failed:', error);
            // Reset button state if play fails
            floatingBtn.innerHTML = '<i class="fas fa-play"></i>';
        }).then(() => {
            // Only update UI if play was successful
            if (!audioPlayer.paused) {
                floatingBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        });
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
        const circumference = 182.21;
        const progress = current / duration;
        const offset = circumference - (progress * circumference);
        progressCircle.style.strokeDashoffset = offset;
    }
}

function updateFloatingDuration() {
    const floatingTime = document.getElementById('floating-time');
    floatingTime.textContent = formatTime(audioPlayer.duration);
}

function resetFloatingButton() {
    const floatingBtn = document.getElementById('floating-play-pause');
    const floatingTime = document.getElementById('floating-time');
    const progressCircle = document.querySelector('.progress-ring-circle');

    floatingBtn.innerHTML = '<i class="fas fa-play"></i>';
    floatingTime.textContent = formatTime(audioPlayer.duration);
    progressCircle.style.strokeDashoffset = 182.21;

    // Auto-advance to next verse (but don't auto-play)
    if (currentVerse) {
        const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
        const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

        // If there's a next verse, move to it (user must press play manually)
        if (currentIndex >= 0 && currentIndex < chapterVerses.length - 1) {
            setTimeout(() => {
                showVerse(chapterVerses[currentIndex + 1]);
            }, 500);
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
        } else if (versesScreen.classList.contains('active')) {
            switchScreen(chaptersScreen);
            backBtn.style.display = 'none';
        } else if (settingsScreen.classList.contains('active') || bookmarksScreen.classList.contains('active')) {
            switchScreen(chaptersScreen);
            backBtn.style.display = 'none';
        }
    });
}

function switchScreen(screen) {
    // Track current active screen before switching
    const currentActiveScreen = document.querySelector('.screen.active');
    if (currentActiveScreen && currentActiveScreen !== screen) {
        previousScreen = currentActiveScreen;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    // Add a class to the body for screen-specific styling
    document.body.classList.remove('verse-detail-active', 'chapters-active', 'verses-active', 'settings-active', 'bookmarks-active');
    if (screen === verseDetailScreen) {
        document.body.classList.add('verse-detail-active');
    } else if (screen === chaptersScreen) {
        document.body.classList.add('chapters-active');
    } else if (screen === versesScreen) {
        document.body.classList.add('verses-active');
    } else if (screen === settingsScreen) {
        document.body.classList.add('settings-active');
    } else if (screen === bookmarksScreen) {
        document.body.classList.add('bookmarks-active');
    }

    // Show/hide back button based on screen
    if (screen === chaptersScreen) {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'block';
    }

    // Handle footer visibility
    if (screen === verseDetailScreen) {
        document.getElementById('footer').style.display = 'none';
        updateAudioPlayerVisibility(); // Use new function to check setting
        document.getElementById('verse-navigation').style.display = 'flex';
        document.getElementById('floating-settings-btn').style.display = 'none';
    } else if (screen === settingsScreen || screen === bookmarksScreen) {
        document.getElementById('footer').style.display = 'block';
        document.getElementById('floating-audio-btn').style.display = 'none';
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
    } else {
        document.getElementById('footer').style.display = 'block';
        document.getElementById('floating-audio-btn').style.display = 'none';
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'block';
    }
}

// Floating Menu Functions
function initFloatingMenu() {
    // Remove any existing listeners first
    const newMainFloatingBtn = mainFloatingBtn.cloneNode(true);
    mainFloatingBtn.parentNode.replaceChild(newMainFloatingBtn, mainFloatingBtn);

    // Update the reference
    const updatedMainFloatingBtn = document.getElementById('main-floating-btn');
    const updatedFloatingMenu = document.getElementById('floating-menu');

    // Toggle menu visibility
    updatedMainFloatingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = updatedFloatingMenu.classList.contains('show');

        if (isOpen) {
            updatedFloatingMenu.classList.remove('show');
            updatedMainFloatingBtn.classList.remove('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
        } else {
            updatedFloatingMenu.classList.add('show');
            updatedMainFloatingBtn.classList.add('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.floating-settings-btn')) {
            updatedFloatingMenu.classList.remove('show');
            updatedMainFloatingBtn.classList.remove('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
        }
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        switchScreen(settingsScreen);
        updatedFloatingMenu.classList.remove('show');
        updatedMainFloatingBtn.classList.remove('opened');
        updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });

    // Bookmarks button
    document.getElementById('bookmarks-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        switchScreen(bookmarksScreen);
        renderBookmarks();
        updatedFloatingMenu.classList.remove('show');
        updatedMainFloatingBtn.classList.remove('opened');
        updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });
}

// Bookmark Functions
function getBookmarks() {
    const bookmarks = localStorage.getItem('gita_bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('gita_bookmarks', JSON.stringify(bookmarks));
}

function isBookmarked(verseId) {
    const bookmarks = getBookmarks();
    return bookmarks.some(bookmark => bookmark.verseId === verseId);
}

function addBookmark(verse) {
    const bookmarks = getBookmarks();
    const chapterTranslations = translations[verse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === verse.id);

    const bookmark = {
        verseId: verse.id,
        chapterNumber: verse.chapter_number,
        verseNumber: verse.verse_number,
        text: verse.text,
        transliteration: verse.transliteration,
        translation: translation ? translation.languages[currentLang]?.description || 'Translation not available' : 'Translation not available',
        language: currentLang,
        dateAdded: new Date().toISOString()
    };

    bookmarks.push(bookmark);
    saveBookmarks(bookmarks);
    updateBookmarkButton();
}

function removeBookmark(verseId) {
    const bookmarks = getBookmarks();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.verseId !== verseId);
    saveBookmarks(filteredBookmarks);
    updateBookmarkButton();
}

function updateBookmarkButton() {
    if (!currentVerse || !bookmarkBtn) return;

    if (isBookmarked(currentVerse.id)) {
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarks-list');
    const bookmarks = getBookmarks();

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px; margin: 20px;">
                <i class="fas fa-heart" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: #666; margin-bottom: 10px;">No Bookmarks Yet</h3>
                <p style="color: #999;">Start bookmarking your favorite verses to see them here.</p>
            </div>
        `;
        return;
    }

    bookmarksList.innerHTML = '';
    bookmarks.reverse().forEach(bookmark => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.innerHTML = `
            <div class="bookmark-header">
                <span class="bookmark-sloka-number">श्लोक ${bookmark.chapterNumber}.${bookmark.verseNumber}</span>
                <button class="remove-bookmark-btn" data-verse-id="${bookmark.verseId}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="bookmark-text">${bookmark.text.replace(/।/, '।<br>')}</div>
            <div class="bookmark-translation">${bookmark.translation}</div>
        `;

        // Add click handler to navigate to verse
        bookmarkItem.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-bookmark-btn')) {
                navigateToBookmarkedVerse(bookmark);
            }
        });

        // Add remove handler
        const removeBtn = bookmarkItem.querySelector('.remove-bookmark-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeBookmark(bookmark.verseId);
            renderBookmarks();
        });

        bookmarksList.appendChild(bookmarkItem);
    });
}

function navigateToBookmarkedVerse(bookmark) {
    // Find the chapter and verse
    const chapter = chapters.find(c => c.chapter_number === bookmark.chapterNumber);
    const verse = verses.find(v => v.id === bookmark.verseId);

    if (chapter && verse) {
        currentChapter = chapter;
        currentVerse = verse;
        window.currentVerse = verse;
        showVerse(verse);
    }
}

// Settings Functions
function initSettings() {
    // Preferred language dropdown in Settings
    const settingsLangDropdown = document.getElementById('settings-language-dropdown');
    if (settingsLangDropdown) {
        settingsLangDropdown.value = currentLang;
        settingsLangDropdown.addEventListener('change', (e) => {
            const newLang = e.target.value;
            if (currentLang !== newLang) {
                currentLang = newLang;
                localStorage.setItem('translationLanguage', newLang);
                
                // Sync with verse screen dropdown if it exists
                const languageDropdown = document.getElementById('language-dropdown');
                if (languageDropdown) {
                    languageDropdown.value = newLang;
                }
                
                if (currentVerse) {
                    updateVerseContent();
                }
            }
        });
    }

    // Audio player toggle setting
    const audioPlayerToggle = document.getElementById('show-audio-player-toggle');
    const showAudioPlayer = localStorage.getItem('showAudioPlayer') !== 'false';

    // Set initial state
    if (audioPlayerToggle) {
        audioPlayerToggle.checked = showAudioPlayer;

        // Update audio player visibility when toggled
        audioPlayerToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            localStorage.setItem('showAudioPlayer', isEnabled);

            // Update visibility immediately if on verse detail screen
            updateAudioPlayerVisibility();
        });
    }

    // Display cache version
    displayCacheVersion();
}

// Update audio player visibility based on setting
function updateAudioPlayerVisibility() {
    const showAudioPlayer = localStorage.getItem('showAudioPlayer') !== 'false';
    const floatingAudioBtn = document.getElementById('floating-audio-btn');

    if (floatingAudioBtn) {
        if (showAudioPlayer && verseDetailScreen.classList.contains('active')) {
            floatingAudioBtn.style.display = 'block';
        } else {
            floatingAudioBtn.style.display = 'none';
        }
    }
}

// Display cache version from service worker
async function displayCacheVersion() {
    try {
        // Fetch the service worker file to extract CACHE_NAME
        const response = await fetch('/sw.js');
        const swContent = await response.text();

        // Extract CACHE_NAME value using regex
        const match = swContent.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);

        if (match && match[1]) {
            const cacheVersion = match[1];
            document.getElementById('cache-version').textContent = `App Version: ${cacheVersion}`;
        } else {
            document.getElementById('cache-version').textContent = 'App Version: unknown';
        }
    } catch (error) {
        console.error('Failed to fetch cache version:', error);
        document.getElementById('cache-version').textContent = 'App Version: error';
    }
}

// Video Tab Functions
let currentVideoLang = 'english';

function resetVideoTabs() {
    currentVideoLang = 'english';
    const tabBtns = document.querySelectorAll('.video-tab-btn');
    const tabPanes = document.querySelectorAll('.video-tab-pane');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === 'english') {
            btn.classList.add('active');
        }
    });

    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.dataset.lang === 'english') {
            pane.classList.add('active');
        }
    });
}

function setupVideoTabs() {
    const tabBtns = document.querySelectorAll('.video-tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchVideoTab(btn.dataset.lang);
        });
    });
}

function switchVideoTab(lang) {
    currentVideoLang = lang;
    const tabBtns = document.querySelectorAll('.video-tab-btn');
    const tabPanes = document.querySelectorAll('.video-tab-pane');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });

    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.dataset.lang === lang) {
            pane.classList.add('active');
        }
    });
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => { })
            .catch(error => { });
    });
}

// Setup Translation and Explanation tabs click handlers
function setupTabs() {
    const tabTranslation = document.getElementById('tab-translation');
    const tabExplanation = document.getElementById('tab-explanation');

    if (tabTranslation && tabExplanation) {
        tabTranslation.addEventListener('click', () => {
            if (currentTab !== 'translation') {
                currentTab = 'translation';
                tabTranslation.classList.add('active');
                tabExplanation.classList.remove('active');
                updateVerseContent();
            }
        });

        tabExplanation.addEventListener('click', () => {
            if (currentTab !== 'explanation') {
                currentTab = 'explanation';
                tabExplanation.classList.add('active');
                tabTranslation.classList.remove('active');
                updateVerseContent();
            }
        });
    }
}

// Update the tabs UI based on active tab state
function updateTabsUI() {
    const tabTranslation = document.getElementById('tab-translation');
    const tabExplanation = document.getElementById('tab-explanation');

    if (tabTranslation && tabExplanation) {
        tabTranslation.classList.remove('active');
        tabExplanation.classList.remove('active');

        if (currentTab === 'translation') {
            tabTranslation.classList.add('active');
        } else {
            tabExplanation.classList.add('active');
        }
    }
}

// Clean Sanskrit/transliteration verse text
function cleanVerseText(text) {
    if (!text) return '';
    let t = text.trim();
    // Strip trailing verse numbers like ।॥ 1.1 ॥
    t = t.replace(/[।॥]+\s*\d+\.\d+\s*[।॥]+\s*$/g, '');
    t = t.trim();
    // Replace all । with ।<br>
    t = t.replace(/।/g, '।<br>');
    // Remove duplicate <br>
    t = t.replace(/(<br>\s*){2,}/g, '<br>');
    t = t.replace(/<br>\s*$/, '');
    return t;
}

// Setup share button click handler
function setupShareButton() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.removeEventListener('click', handleShareClick);
        shareBtn.addEventListener('click', handleShareClick);
    }
}

// Handle share button click to open share sheet
function handleShareClick() {
    openShareSheet();
}

// Initialize Share Sheet options & backdrop close handler
function initShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    const copyLinkBtn = document.getElementById('share-option-copy');
    const shareImageBtn = document.getElementById('share-option-image');

    if (shareSheet) {
        shareSheet.addEventListener('click', (e) => {
            if (e.target === shareSheet) {
                closeShareSheet();
            }
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', handleCopyLink);
    }

    if (shareImageBtn) {
        shareImageBtn.addEventListener('click', handleShareImage);
    }
}

// Open Share Sheet
function openShareSheet() {
    if (!currentVerse) return;

    if (navigator.vibrate) navigator.vibrate(10);

    const shareSheet = document.getElementById('share-sheet');
    const titleSpan = document.getElementById('share-sheet-title');
    const linkSub = document.getElementById('share-option-link-sub');
    const imageSub = document.getElementById('share-option-image-sub');

    titleSpan.textContent = `श्लोक ${currentVerse.chapter_number}.${currentVerse.verse_number}`;
    linkSub.textContent = `gitagyan.in/?c=${currentVerse.chapter_number}&v=${currentVerse.verse_number}`;

    const langNames = {
        english: 'English', hindi: 'Hindi', gujarati: 'Gujarati',
        bengali: 'Bengali', tamil: 'Tamil', telugu: 'Telugu',
        marathi: 'Marathi', kannada: 'Kannada', punjabi: 'Punjabi',
        spanish: 'Spanish', arabic: 'Arabic', chinese: 'Chinese'
    };
    imageSub.textContent = `Translation & Explanation in ${langNames[currentLang] || currentLang}`;

    // Reset Copy button visual state
    const copyBtn = document.getElementById('share-option-copy');
    if (copyBtn) {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('.share-option-title').textContent = 'Copy Link';
        copyBtn.querySelector('.share-option-icon').innerHTML = '<i class="fas fa-link"></i>';
    }

    shareSheet.style.display = 'flex';

    // Start generating image immediately
    generateShareImage();
}

// Close Share Sheet
function closeShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (shareSheet) {
        shareSheet.style.display = 'none';
    }
}

// Copy Link Handler
function handleCopyLink() {
    if (!currentVerse) return;
    if (navigator.vibrate) navigator.vibrate(10);

    const url = `${window.location.origin}/?c=${currentVerse.chapter_number}&v=${currentVerse.verse_number}`;
    const copyBtn = document.getElementById('share-option-copy');

    navigator.clipboard.writeText(url).then(() => {
        if (copyBtn) {
            copyBtn.classList.add('copied');
            copyBtn.querySelector('.share-option-title').textContent = 'Link Copied!';
            copyBtn.querySelector('.share-option-icon').innerHTML = '<i class="fas fa-check"></i>';
        }
        setTimeout(() => {
            closeShareSheet();
        }, 1200);
    }).catch(err => {
        console.error('Failed to copy link:', err);
    });
}

// Generate the high-fidelity share image using html-to-image + Canvas
async function generateShareImage() {
    if (!currentVerse) return;

    preGeneratedShareBlob = null;
    isGeneratingShareImage = true;

    const shareImageBtn = document.getElementById('share-option-image');
    const imageTitle = document.getElementById('share-option-image-title');
    const iconWrapper = shareImageBtn.querySelector('.share-option-icon');

    // Show generating state
    shareImageBtn.disabled = true;
    imageTitle.textContent = 'Generating...';
    iconWrapper.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Load background image
        let bgImg = shareBgImage;
        if (!bgImg || !bgImg.complete) {
            bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.src = './images/krishna-and-arjuna.jpg';
            await new Promise((resolve, reject) => {
                bgImg.onload = resolve;
                bgImg.onerror = reject;
            });
        }

        // Render card content details
        document.getElementById('share-card-pill').textContent = `श्लोक ${currentVerse.chapter_number}.${currentVerse.verse_number}`;

        // Clean Devanagari Sanskrit text
        const cleanText = cleanVerseText(currentVerse.text).replace(/<br>/g, '\n');
        document.getElementById('share-card-text').textContent = cleanText;

        // Clean Transliteration text
        const cleanTranslit = cleanVerseText(currentVerse.transliteration).replace(/<br>/g, '\n');
        document.getElementById('share-card-translit').textContent = cleanTranslit;

        // Populate translation text
        const chapterTrans = translations[currentVerse.chapter_number] || [];
        const transData = chapterTrans.find(t => t.verse_id === currentVerse.id);
        const transLang = transData?.languages?.[currentLang];

        const transText = transLang?.description || '';
        const translationContainer = document.getElementById('share-card-translation-container');
        if (transText) {
            document.getElementById('share-card-translation-text').textContent = transText;
            translationContainer.style.display = 'block';
        } else {
            translationContainer.style.display = 'none';
        }

        // Populate explanation text
        const explanationText = transLang?.meaning || '';
        const explanationContainer = document.getElementById('share-card-explanation-container');
        if (explanationText) {
            document.getElementById('share-card-explanation-text').textContent = explanationText;
            explanationContainer.style.display = 'block';
        } else {
            explanationContainer.style.display = 'none';
        }

        // Show card offscreen for screenshotting
        const cardEl = document.getElementById('share-card');
        cardEl.style.left = '0px';

        // Wait two animation frames for DOM styling to settle
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // Capture content card PNG
        const contentDataUrl = await htmlToImage.toPng(cardEl, { pixelRatio: 3, skipFonts: true });

        // Hide card offscreen again
        cardEl.style.left = '-9999px';

        // Load content image
        const contentImg = new Image();
        contentImg.src = contentDataUrl;
        await new Promise((resolve, reject) => {
            contentImg.onload = resolve;
            contentImg.onerror = reject;
        });

        // Composite background, gradient overlay, and content screenshot via Canvas
        const canvas = document.createElement('canvas');
        canvas.width = contentImg.width;
        canvas.height = contentImg.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw background cover
        const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
        const scale = Math.max(canvas.width / iw, canvas.height / ih);
        const sw = iw * scale, sh = ih * scale;
        ctx.drawImage(bgImg, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh);

        // Draw linear gradient overlay
        const grad = ctx.createLinearGradient(0, 0, canvas.width * 0.6, canvas.height);
        grad.addColorStop(0, 'rgba(255,220,100,0.78)');
        grad.addColorStop(0.4, 'rgba(255,180,40,0.72)');
        grad.addColorStop(1, 'rgba(230,100,0,0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw content text card on top
        ctx.drawImage(contentImg, 0, 0);

        // Export final canvas to blob
        const finalDataUrl = canvas.toDataURL('image/png');
        const res = await fetch(finalDataUrl);
        preGeneratedShareBlob = await res.blob();

        // Update button to active state
        shareImageBtn.disabled = false;
        imageTitle.textContent = 'Share as Image';
        iconWrapper.innerHTML = '<i class="fas fa-image"></i>';
        isGeneratingShareImage = false;

    } catch (error) {
        console.error('Failed to generate share card image:', error);
        shareImageBtn.disabled = true;
        imageTitle.textContent = 'Generation Failed';
        iconWrapper.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        isGeneratingShareImage = false;
    }
}

// Share Image Button Handler
async function handleShareImage() {
    if (!currentVerse || !preGeneratedShareBlob) return;
    if (navigator.vibrate) navigator.vibrate(10);

    const fileName = `gita-${currentVerse.chapter_number}-${currentVerse.verse_number}.png`;
    const file = new File([preGeneratedShareBlob], fileName, { type: 'image/png' });

    try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Bhagavad Gita ${currentVerse.chapter_number}.${currentVerse.verse_number}`
            });
        } else {
            // Fallback: download file
            const url = URL.createObjectURL(preGeneratedShareBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
        closeShareSheet();
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Share action failed:', e);
        }
    }
}

// Start app
init();
