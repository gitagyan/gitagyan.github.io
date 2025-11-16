// Global variables
let chapters = [];
let verses = [];
let translations = {}; // Changed from array to object: {chapterNumber: [translations]}
let youtubeVideos = []; // YouTube videos for chapters
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english', 'hindi', or 'gujarati' - for verse translations
let startX = 0;
let endX = 0;
let previousScreen = null; // Track where user came from

// Make key variables accessible to app-saarthi.js via window object
window.currentVerse = null;

// DOM elements
const chaptersScreen = document.getElementById('chapters-screen');
const versesScreen = document.getElementById('verses-screen');
const verseDetailScreen = document.getElementById('verse-detail-screen');
const aiSetupScreen = document.getElementById('ai-setup-screen');
const aiChatScreen = document.getElementById('ai-chat-screen');
const settingsScreen = document.getElementById('settings-screen');
const bookmarksScreen = document.getElementById('bookmarks-screen');
const chaptersList = document.getElementById('chapters-list');
const versesList = document.getElementById('verses-list');
const chapterTitle = document.getElementById('chapter-title');
const audioPlayer = document.getElementById('audio-player');
const backBtn = document.getElementById('back-btn');
const aiBtn = document.getElementById('ai-btn');
const mainFloatingBtn = document.getElementById('main-floating-btn');
const floatingMenu = document.getElementById('floating-menu');
const bookmarkBtn = document.getElementById('bookmark-btn');

// Initialize app
async function init() {
    try {
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

    // Initialize Sarthi AI if module is loaded
    if (window.AppSarthi && window.AppSarthi.initSarthi) {
        window.AppSarthi.initSarthi();
    }        // Initialize settings
        initSettings();
        
        // Initialize floating menu
        initFloatingMenu();

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
    
    // Load YouTube video for this chapter
    const videoContainer = document.getElementById('chapter-video-container');
    const videoIframe = document.getElementById('chapter-video-iframe');
    
    if (youtubeVideos && youtubeVideos.length > 0) {
        // Find video for current chapter (chapter_number - 1 because array is 0-indexed)
        const chapterVideo = youtubeVideos[chapter.chapter_number - 1];
        
        if (chapterVideo && chapterVideo.video_id) {
            videoIframe.src = `https://www.youtube.com/embed/${chapterVideo.video_id}`;
            videoContainer.style.display = 'block';
        } else {
            videoContainer.style.display = 'none';
        }
    } else {
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
        verseTranslation.innerHTML = translation.languages[currentLang].description;
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
        <div class="sloka-number-pill">श्लोक ${verse.chapter_number}.${verse.verse_number}</div>
        <div id="verse-text">${verse.text.replace(/।/, '।<br>')}</div>
        <div id="verse-transliteration">${verse.transliteration.replace(/।/, '।<br>')}</div>
    `;

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
        if (previousScreen === aiChatScreen) {
            switchScreen(aiChatScreen);
        } else {
            switchScreen(versesScreen);
        }
    } else if (currentActiveScreen === versesScreen) {
        switchScreen(chaptersScreen);
        backBtn.style.display = 'none';
    } else if (currentActiveScreen === aiSetupScreen || currentActiveScreen === aiChatScreen) {
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
            // Check if we came from AI chat screen
            if (previousScreen === aiChatScreen) {
                switchScreen(aiChatScreen);
            } else {
                switchScreen(versesScreen);
            }
        } else if (versesScreen.classList.contains('active')) {
            switchScreen(chaptersScreen);
            backBtn.style.display = 'none';
        } else if (aiSetupScreen.classList.contains('active') || aiChatScreen.classList.contains('active')) {
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
    document.body.classList.remove('verse-detail-active', 'chapters-active', 'verses-active', 'settings-active', 'ai-chat-active', 'bookmarks-active');
    if (screen === verseDetailScreen) {
        document.body.classList.add('verse-detail-active');
    } else if (screen === chaptersScreen) {
        document.body.classList.add('chapters-active');
    } else if (screen === versesScreen) {
        document.body.classList.add('verses-active');
    } else if (screen === settingsScreen) {
        document.body.classList.add('settings-active');
    } else if (screen === aiChatScreen) {
        document.body.classList.add('ai-chat-active');
    } else if (screen === bookmarksScreen) {
        document.body.classList.add('bookmarks-active');
    }

    // Show/hide back button based on screen
    if (screen === chaptersScreen) {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'block';
    }
    
    // Handle footer visibility and AI button
    if (screen === verseDetailScreen) {
        document.getElementById('footer').style.display = 'none';
        document.getElementById('floating-audio-btn').style.display = 'block';
        document.getElementById('verse-navigation').style.display = 'flex';
        aiBtn.style.display = 'block';
        document.getElementById('floating-settings-btn').style.display = 'none';
    } else if (screen === aiChatScreen || screen === aiSetupScreen) {
        document.getElementById('footer').style.display = 'block';
        document.getElementById('floating-audio-btn').style.display = 'none';
        document.getElementById('verse-navigation').style.display = 'none';
        aiBtn.style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
    } else if (screen === settingsScreen || screen === bookmarksScreen) {
        document.getElementById('footer').style.display = 'block';
        document.getElementById('floating-audio-btn').style.display = 'none';
        document.getElementById('verse-navigation').style.display = 'none';
        aiBtn.style.display = 'block';
        document.getElementById('floating-settings-btn').style.display = 'none';
    } else {
        document.getElementById('footer').style.display = 'block';
        document.getElementById('floating-audio-btn').style.display = 'none';
        document.getElementById('verse-navigation').style.display = 'none';
        aiBtn.style.display = 'block';
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
    const geminiApiKey = localStorage.getItem('geminiApiKey');
    
    // Load current API key into settings
    const settingsApiKeyInput = document.getElementById('settings-api-key-input');
    if (geminiApiKey) {
        settingsApiKeyInput.value = geminiApiKey;
        // Show visual indication that API key is configured
        settingsApiKeyInput.style.borderColor = '#28a745';
        settingsApiKeyInput.style.background = 'rgba(40, 167, 69, 0.1)';
    }
    
    // Toggle API key visibility in settings
    document.getElementById('toggle-settings-api-key-visibility').addEventListener('click', () => {
        const input = document.getElementById('settings-api-key-input');
        const icon = document.querySelector('#toggle-settings-api-key-visibility i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    // Update API key
    document.getElementById('update-api-key-btn').addEventListener('click', () => {
        const apiKey = settingsApiKeyInput.value.trim();
        const updateBtn = document.getElementById('update-api-key-btn');
        
        if (!apiKey) {
            settingsApiKeyInput.style.borderColor = '#dc3545';
            settingsApiKeyInput.focus();
            setTimeout(() => {
                settingsApiKeyInput.style.borderColor = '';
            }, 2000);
            return;
        }
        
        if (apiKey.length < 10) {
            settingsApiKeyInput.style.borderColor = '#dc3545';
            settingsApiKeyInput.focus();
            setTimeout(() => {
                settingsApiKeyInput.style.borderColor = '';
            }, 2000);
            return;
        }
        
        // Show loading state
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        updateBtn.disabled = true;
        
        setTimeout(() => {
            localStorage.setItem('geminiApiKey', apiKey);
            
            // Success feedback
            updateBtn.innerHTML = '<i class="fas fa-check"></i>';
            settingsApiKeyInput.style.borderColor = '#28a745';
            
            setTimeout(() => {
                updateBtn.innerHTML = '<i class="fas fa-save"></i>';
                updateBtn.disabled = false;
                settingsApiKeyInput.style.borderColor = '';
            }, 2000);
        }, 500);
    });
    
    // Remove API key
    document.getElementById('remove-api-key-btn').addEventListener('click', () => {
        const removeBtn = document.getElementById('remove-api-key-btn');
        
        if (confirm('Are you sure you want to remove your API key? You will need to re-enter it to use Sarthi AI.')) {
            // Show loading state
            removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            removeBtn.disabled = true;
            
            setTimeout(() => {
                localStorage.removeItem('geminiApiKey');
                settingsApiKeyInput.value = '';
                
                // Success feedback
                removeBtn.innerHTML = '<i class="fas fa-check"></i>';
                
                setTimeout(() => {
                    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    removeBtn.disabled = false;
                }, 2000);
            }, 500);
        }
    });
    
    // Display cache version
    displayCacheVersion();
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
