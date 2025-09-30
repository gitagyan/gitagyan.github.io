// Global variables
let chapters = [];
let verses = [];
let translations = [];
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english', 'hindi', or 'gujarati' - for verse translations
let startX = 0;
let endX = 0;
let geminiApiKey = null;
let previousScreen = null; // Track where user came from
let sarthiLanguage = 'english'; // Default language for Sarthi translations

// Gemini API Model Configuration
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_TRANSLATION_MODEL = 'gemini-2.5-flash-lite';

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
const verseText = document.getElementById('verse-text');
const verseTransliteration = document.getElementById('verse-transliteration');
const verseTranslation = document.getElementById('verse-translation');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekSlider = document.getElementById('seek-slider');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
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
        translations = await fetch('./assets/verse-translations.json').then(r => r.json());

        // Load saved translation language preference
        const savedTranslationLang = localStorage.getItem('translationLanguage');
        if (savedTranslationLang) {
            currentLang = savedTranslationLang;
        }

        // Initialize AI
        initAI();
        
        // Initialize floating menu
        initFloatingMenu();

        // Render chapters
        renderChapters();

        // Setup navigation
        setupNavigation();
        setupLangSwitcher();
        setupSwipeGestures();
        setupSarthiTranslate();
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
        <div class="sloka-number-pill">श्लोक ${verse.chapter_number}.${verse.verse_number}</div>
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

function updateLanguageDropdown() {
    const languageDropdown = document.getElementById('language-dropdown');
    if (languageDropdown) {
        languageDropdown.value = currentLang;
    }
}

// Setup language switcher (legacy - keeping for compatibility)
function setupLangSwitcher() {
    // This function is now handled by setupLanguagePills
    return;
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
        // Left edge right swipe - go to previous screen
        console.log('Left edge swipe detected - going to previous screen');
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
    if (!currentVerse) {
        console.log('No current verse set');
        return;
    }
    
    const deltaX = endX - startX;
    const threshold = 50; // Minimum swipe distance for verse navigation
    const screenWidth = window.innerWidth;
    const edgeThreshold = screenWidth * 0.1; // 10% of screen width from edge
    
    // Don't handle verse navigation if swipe starts from left edge (reserved for screen navigation)
    if (startX <= edgeThreshold) {
        return;
    }
    
    console.log('Verse swipe detected:', { deltaX, startX, endX, threshold });

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
        const circumference = 182.21;
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
        aiBtn.style.display = 'none'; // Hide AI button when on AI screens
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

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

// Chat history functions
function saveChatHistory() {
    const messages = [];
    const messageElements = document.querySelectorAll('.chat-message');
    
    messageElements.forEach(messageEl => {
        const sender = messageEl.classList.contains('user') ? 'user' : 'ai';
        const bubble = messageEl.querySelector('.message-bubble');
        
        if (sender === 'ai' && bubble.querySelector('.sloka-pills-container')) {
            // AI message with sloka pills
            const responseText = bubble.querySelector('.sarthi-response').innerHTML;
            const slokaPills = Array.from(bubble.querySelectorAll('.sloka-pill')).map(pill => 
                pill.getAttribute('data-sloka')
            );
            messages.push({
                sender: 'ai',
                text: responseText,
                slokaNumbers: slokaPills,
                isHTML: true
            });
        } else {
            // Regular message
            const text = sender === 'ai' ? bubble.innerHTML : bubble.textContent;
            messages.push({
                sender,
                text,
                isHTML: sender === 'ai'
            });
        }
    });
    
    localStorage.setItem('sarthiChatHistory', JSON.stringify(messages));
}

function loadChatHistory() {
    const savedHistory = localStorage.getItem('sarthiChatHistory');
    if (!savedHistory) return false;
    
    const messages = JSON.parse(savedHistory);
    const messagesContainer = document.getElementById('ai-chat-messages');
    
    // Clear current messages
    messagesContainer.innerHTML = '';
    
    // Restore messages
    messages.forEach(message => {
        if (message.sender === 'ai' && message.slokaNumbers) {
            // Restore AI message with sloka pills
            addMessage('ai', message.text, message.slokaNumbers, true);
        } else {
            // Restore regular message
            addMessage(message.sender, message.text, null, message.isHTML);
        }
    });
    
    return messages.length > 0;
}

function clearChatHistory() {
    localStorage.removeItem('sarthiChatHistory');
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
            // Close menu
            updatedFloatingMenu.classList.remove('show');
            updatedMainFloatingBtn.classList.remove('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
        } else {
            // Open menu
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
    const translation = translations.find(t => t.verse_id === verse.id);
    
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
        showVerse(verse);
    }
}

// Settings Functions
function initSettings() {
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
            // Visual feedback for empty input
            settingsApiKeyInput.style.borderColor = '#dc3545';
            settingsApiKeyInput.focus();
            setTimeout(() => {
                settingsApiKeyInput.style.borderColor = '';
            }, 2000);
            return;
        }
        
        // Basic validation for API key format
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
            geminiApiKey = apiKey;
            
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
                geminiApiKey = null;
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
}

// AI Functions
function initAI() {
    // Check if API key exists in localStorage
    geminiApiKey = localStorage.getItem('geminiApiKey');
    
    // Initialize settings
    initSettings();
    
    // Setup AI button click handler
    aiBtn.addEventListener('click', handleAIButtonClick);
    
    // Setup API key save functionality
    document.getElementById('save-api-key-btn').addEventListener('click', saveApiKey);
    document.getElementById('toggle-api-key-visibility').addEventListener('click', toggleApiKeyVisibility);
    
    // Setup chat functionality
    document.getElementById('ai-send-btn').addEventListener('click', sendMessage);
    document.getElementById('ai-chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Setup starter prompts
    document.querySelectorAll('.starter-prompt').forEach(prompt => {
        prompt.addEventListener('click', () => {
            const message = prompt.getAttribute('data-prompt');
            document.getElementById('ai-chat-input').value = message;
            sendMessage();
        });
    });
    
    // Setup clear chat button
    document.getElementById('clear-chat-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            clearChatHistory();
            initializeChatScreen();
        }
    });
}

function handleAIButtonClick() {
    if (geminiApiKey) {
        // Show chat screen
        switchScreen(aiChatScreen);
        initializeChatScreen();
        // Ensure starter prompts are visible by default
        setTimeout(() => {
            const starterPrompts = document.getElementById('ai-starter-prompts');
            if (starterPrompts) {
                starterPrompts.style.display = 'flex';
                console.log('Starter prompts should now be visible');
            }
        }, 100);
    } else {
        // Show setup screen
        switchScreen(aiSetupScreen);
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    
    if (!apiKey) {
        alert('Please enter a valid API key');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('geminiApiKey', apiKey);
    geminiApiKey = apiKey;
    
    // Show success message and switch to chat
    alert('API key saved successfully!');
    switchScreen(aiChatScreen);
    initializeChatScreen();
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('api-key-input');
    const icon = document.querySelector('#toggle-api-key-visibility i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function initializeChatScreen() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const starterPrompts = document.getElementById('ai-starter-prompts');
    
    console.log('Initializing chat screen...');
    
    // Try to load chat history first
    const hasHistory = loadChatHistory();
    
    if (!hasHistory) {
        // Clear previous messages if no history
        messagesContainer.innerHTML = '';
        
        // Add welcome message
        addMessage('ai', 'Hello! I am Sarthi AI. I can help you find relevant verses from the Bhagavad Gita to answer your questions. Please ask your question.');
    }
    
    // Check if there are any user messages (not just AI welcome message)
    const hasUserMessages = hasHistory && checkForUserMessages();
    
    console.log('Has history:', hasHistory, 'Has user messages:', hasUserMessages);
    
    if (!hasUserMessages) {
        // Show starter prompts if no user messages
        starterPrompts.style.display = 'flex';
        console.log('Showing starter prompts');
    } else {
        // Hide starter prompts if we have user messages
        starterPrompts.style.display = 'none';
        console.log('Hiding starter prompts');
    }
}

function checkForUserMessages() {
    const savedHistory = localStorage.getItem('sarthiChatHistory');
    if (!savedHistory) return false;
    
    const messages = JSON.parse(savedHistory);
    return messages.some(message => message.sender === 'user');
}

async function sendMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Hide starter prompts
    document.getElementById('ai-starter-prompts').style.display = 'none';
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Make API call to Gemini
        const response = await callGeminiAPI(message);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Parse response and show slokas
        displaySlokaResponse(response);
        
    } catch (error) {
        console.error('AI Error:', error);
        removeTypingIndicator();
        addMessage('ai', 'Sorry, there was a technical issue. Please try again later.');
    }
}

async function callGeminiAPI(userMessage) {
    const combinedPrompt = `You are Sarthi AI. Help users by recommending 3 relevant Bhagavad Gita verses for their questions.

User Question: ${userMessage}

Respond in this format:
Brief guidance (2-3 sentences)

Recommended Verses:
Chapter X, Verse Y: Why this verse helps
Chapter X, Verse Y: Why this verse helps  
Chapter X, Verse Y: Why this verse helps

Keep it concise and practical.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: combinedPrompt }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    // Check if candidates array exists and has content
    if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in API response:', data);
        throw new Error('No response from AI service');
    }
    
    const candidate = data.candidates[0];
    console.log('First candidate:', candidate);
    
    // Check if candidate has content
    if (!candidate.content) {
        console.error('No content in candidate:', candidate);
        throw new Error('AI service returned empty response');
    }
    
    console.log('Candidate content:', candidate.content);
    
    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('No parts in content:', candidate.content);
        console.error('Full candidate:', candidate);
        
        // Check if this is a safety/content filter issue
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKED_REASON_UNSPECIFIED') {
            throw new Error('Response was blocked by content filters. Please try rephrasing your question.');
        }
        
        // Check if response was cut off due to token limit
        if (candidate.finishReason === 'MAX_TOKENS') {
            throw new Error('Response was too long and got cut off. Please try a more specific question.');
        }
        
        throw new Error('AI service returned no content. Please try again with a different question.');
    }
    
    const part = candidate.content.parts[0];
    console.log('First part:', part);
    
    // Check if part has text
    if (!part.text) {
        console.error('No text in part:', part);
        throw new Error('AI service returned no text');
    }
    
    return part.text.trim();
}

function displaySlokaResponse(response) {
    // Extract sloka numbers from the response using regex
    const slokaPattern = /Chapter\s+(\d+),\s+Verse\s+(\d+)/gi;
    const matches = [...response.matchAll(slokaPattern)];
    const slokaNumbers = matches.map(match => `${match[1]}.${match[2]}`);
    
    // Add the AI's complete response
    addMessage('ai', response, slokaNumbers.length > 0 ? slokaNumbers : null);
}

// Markdown rendering function
function parseMarkdown(text) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Headers
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Code blocks (triple backticks)
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Lists
    text = text.replace(/^\- (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    return text;
}

function addMessage(sender, text, slokaNumbers = null, isHTML = false) {
    const messagesContainer = document.getElementById('ai-chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (sender === 'ai' && slokaNumbers) {
        // AI message with sloka pills - render markdown or use HTML
        const renderedText = isHTML ? text : parseMarkdown(text);
        bubbleDiv.innerHTML = `
            <div class="sarthi-response">${renderedText}</div>
            <div class="sloka-pills-container">
                ${slokaNumbers.map(sloka => 
                    `<button class="sloka-pill" data-sloka="${sloka}">Verse ${sloka}</button>`
                ).join('')}
            </div>
        `;
        
        // Add click handlers to sloka pills
        setTimeout(() => {
            messageDiv.querySelectorAll('.sloka-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const slokaRef = pill.getAttribute('data-sloka');
                    navigateToSloka(slokaRef);
                });
            });
        }, 100);
    } else if (sender === 'ai') {
        // AI message without sloka pills - render markdown or use HTML
        bubbleDiv.innerHTML = isHTML ? text : parseMarkdown(text);
    } else {
        // User message - plain text
        bubbleDiv.textContent = text;
    }
    
    messageDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save chat history after adding message
    saveChatHistory();
}

function navigateToSloka(slokaRef) {
    // Parse chapter.verse format
    const [chapterNum, verseNum] = slokaRef.split('.').map(n => parseInt(n));
    
    // Find the chapter and verse
    const chapter = chapters.find(c => c.chapter_number === chapterNum);
    const verse = verses.find(v => v.chapter_number === chapterNum && v.verse_number === verseNum);
    
    if (chapter && verse) {
        // Set current chapter and verse
        currentChapter = chapter;
        currentVerse = verse;
        
        // Navigate to verse detail screen
        showVerse(verse);
    } else {
        alert('Sloka not found. Please try again later.');
    }
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai typing-indicator-message';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator-message');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Sarthi Translate Functions
function setupSarthiTranslate() {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('sarthiLanguage');
    if (savedLanguage) {
        sarthiLanguage = savedLanguage;
        const languageSelect = document.getElementById('sarthi-translate-language');
        if (languageSelect) {
            languageSelect.value = savedLanguage;
        }
    }
    
    // Setup save language button
    const saveLanguageBtn = document.getElementById('save-translate-language-btn');
    if (saveLanguageBtn) {
        saveLanguageBtn.addEventListener('click', saveSarthiLanguage);
    }
    
    // Setup SarthiAI pill click handler
    document.addEventListener('click', function(e) {
        if (e.target.closest('.sarthi-ai-pill')) {
            handleSarthiAIPillClick();
        }
    });
}

function saveSarthiLanguage() {
    const languageSelect = document.getElementById('sarthi-translate-language');
    const saveBtn = document.getElementById('save-translate-language-btn');
    
    if (!languageSelect) return;
    
    const selectedLanguage = languageSelect.value;
    
    if (!selectedLanguage) {
        alert('Please select a language');
        return;
    }
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    saveBtn.disabled = true;
    
    setTimeout(() => {
        // Save to localStorage
        localStorage.setItem('sarthiLanguage', selectedLanguage);
        sarthiLanguage = selectedLanguage;
        
        // Success feedback
        saveBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i>';
            saveBtn.disabled = false;
        }, 2000);
    }, 500);
}

async function handleSarthiAIPillClick() {
    if (!geminiApiKey) {
        alert('Please configure your API key in Settings first to use Sarthi AI.');
        return;
    }
    
    if (!currentVerse) {
        alert('No verse selected for translation.');
        return;
    }
    
    // Get the SarthiAI pill and show loading state
    const sarthiPill = document.querySelector('.sarthi-ai-pill');
    const verseTranslation = document.getElementById('verse-translation');
    
    if (sarthiPill && verseTranslation) {
        const originalContent = sarthiPill.innerHTML;
        const originalTranslation = verseTranslation.innerHTML;
        
        sarthiPill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        sarthiPill.style.pointerEvents = 'none';
        verseTranslation.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">✨ Generating AI summary...</div>';
        
        try {
            const aiSummary = await getSarthiTranslation(currentVerse);
            
            // Show AI summary in the translation card
            const languageNames = {
                'english': 'English',
                'hindi': 'Hindi', 
                'gujarati': 'Gujarati',
                'bengali': 'Bengali',
                'tamil': 'Tamil',
                'telugu': 'Telugu',
                'marathi': 'Marathi',
                'kannada': 'Kannada',
                'punjabi': 'Punjabi',
                'spanish': 'Spanish',
                'arabic': 'Arabic',
                'chinese': 'Chinese'
            };
            const displayLanguage = languageNames[sarthiLanguage] || sarthiLanguage.charAt(0).toUpperCase() + sarthiLanguage.slice(1);
            
            verseTranslation.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-bottom: 10px; display: inline-block;">
                    ✨ SarthiAI Enhanced (${displayLanguage})
                </div>
                <div>${parseMarkdown(aiSummary)}</div>
                <div style="font-size: 11px; color: #A5252C; margin-top: 10px; text-align: center; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px;">
                    ✨ Sarthi Language can be changed in Settings
                </div>
            `;
            
        } catch (error) {
            console.error('Error getting Sarthi translation:', error);
            // Restore original translation on error
            verseTranslation.innerHTML = originalTranslation;
            alert('Error getting AI summary. Please try again.');
        } finally {
            // Restore original pill state
            sarthiPill.innerHTML = originalContent;
            sarthiPill.style.pointerEvents = 'auto';
        }
    }
}

async function getSarthiTranslation(verse) {
    // Create cache key for this chapter
    const chapterCacheKey = `sarthi_chapter_${verse.chapter_number}`;
    
    // Get existing chapter cache or create new one
    let chapterCache = {};
    const existingCache = localStorage.getItem(chapterCacheKey);
    if (existingCache) {
        try {
            chapterCache = JSON.parse(existingCache);
        } catch (e) {
            console.warn('Invalid cache data, creating new cache');
            chapterCache = {};
        }
    }
    
    // Check if we have cached response for this verse and language
    const verseKey = `${verse.verse_number}_${sarthiLanguage}`;
    if (chapterCache[verseKey]) {
        console.log('Loading Sarthi response from cache for verse', verse.chapter_number + '.' + verse.verse_number, 'in', sarthiLanguage);
        return chapterCache[verseKey];
    }
    
    // Language mapping for proper AI prompting
    const languageNames = {
        'english': 'English',
        'hindi': 'Hindi',
        'gujarati': 'Gujarati',
        'bengali': 'Bengali',
        'tamil': 'Tamil',
        'telugu': 'Telugu',
        'marathi': 'Marathi',
        'kannada': 'Kannada',
        'punjabi': 'Punjabi',
        'spanish': 'Spanish',
        'arabic': 'Arabic',
        'chinese': 'Chinese'
    };
    
    const languageName = languageNames[sarthiLanguage] || 'English';
    
    const prompt = `You are an AI spiritual guide. Provide a concise, enhanced translation/summary of this Bhagavad Gita verse in ${languageName}:

Chapter ${verse.chapter_number}, Verse ${verse.verse_number}:
Sanskrit: ${verse.text}

Provide a clear, practical explanation of the verse's core teaching in 2-3 sentences. Focus on the essential spiritual wisdom and its practical application. Keep it similar in length to a regular translation but with deeper insight.

IMPORTANT: You must respond ONLY in ${languageName} language. If the language is Hindi, use Devanagari script. If Gujarati, use Gujarati script. Do not mix languages or use English words unless absolutely necessary. Maximum 80 words.`;

    console.log('Fetching new Sarthi response from API for verse', verse.chapter_number + '.' + verse.verse_number, 'in', sarthiLanguage);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TRANSLATION_MODEL}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Sarthi API Error Response:', errorText);
        throw new Error(`Failed to get translation from Gemini API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Sarthi API Response:', data);
    
    // Check if candidates array exists and has content
    if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in Sarthi API response:', data);
        throw new Error('No response from Sarthi AI service');
    }
    
    const candidate = data.candidates[0];
    console.log('Sarthi first candidate:', candidate);
    
    // Check if candidate has content
    if (!candidate.content) {
        console.error('No content in Sarthi candidate:', candidate);
        throw new Error('Sarthi AI service returned empty response');
    }
    
    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('No parts in Sarthi content:', candidate.content);
        throw new Error('Sarthi AI service returned malformed response');
    }
    
    const part = candidate.content.parts[0];
    
    // Check if part has text
    if (!part.text) {
        console.error('No text in Sarthi part:', part);
        throw new Error('Sarthi AI service returned no text');
    }
    
    const aiResponse = part.text;
    
    // Cache the response in chapter-based structure
    chapterCache[verseKey] = aiResponse;
    localStorage.setItem(chapterCacheKey, JSON.stringify(chapterCache));
    console.log('Cached Sarthi response for verse', verse.chapter_number + '.' + verse.verse_number, 'in', sarthiLanguage);
    
    return aiResponse;
}

function showSarthiTranslationModal(translation) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(25px);
        border-radius: 20px;
        padding: 30px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.3);
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="color: #A5252C; margin: 0; display: flex; align-items: center; gap: 8px;">
                ✨ SarthiAI Summary
            </h3>
            <button id="close-sarthi-modal" style="background: none; border: none; font-size: 24px; color: #A5252C; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="color: #333; line-height: 1.6; font-size: 16px;">${parseMarkdown(translation)}</div>
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(165, 37, 44, 0.2); font-size: 12px; color: #666; text-align: center;">
            Chapter ${currentVerse.chapter_number}, Verse ${currentVerse.verse_number} • Language: ${sarthiLanguage}
        </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Close modal handlers
    function closeModal() {
        document.body.removeChild(modalOverlay);
    }
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    document.getElementById('close-sarthi-modal').addEventListener('click', closeModal);
    
    // Close on escape key
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Start app
init();