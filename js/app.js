// Global variables
let chapters = [];
let verses = [];
let translations = [];
let currentChapter = null;
let currentVerse = null;
let currentLang = 'hindi'; // 'english', 'hindi', or 'gujarati'
let startX = 0;
let endX = 0;
let geminiApiKey = null;
let previousScreen = null; // Track where user came from

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
    progressCircle.style.strokeDashoffset = 138.23;

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
    
    // Try to load chat history first
    const hasHistory = loadChatHistory();
    
    if (!hasHistory) {
        // Clear previous messages if no history
        messagesContainer.innerHTML = '';
        
        // Show starter prompts if no messages
        starterPrompts.style.display = 'flex';
        
        // Add welcome message
        addMessage('ai', 'Hello! I am Sarthi AI. I can help you find relevant verses from the Bhagavad Gita to answer your questions. Please ask your question.');
    } else {
        // Hide starter prompts if we have history
        starterPrompts.style.display = 'none';
    }
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
    const systemPrompt = `You are "Sarthi AI", a spiritual guide who helps users find relevant verses from the Bhagavad Gita based on their life questions or situations. You have deep knowledge of the Bhagavad Gita and can relate modern life problems to ancient wisdom.

**IMPORTANT INSTRUCTIONS:**
1. You must ALWAYS respond only in English language, regardless of the user's input language
2. Never respond in Hindi, Sanskrit, or any other language - only English
3. For each user query, recommend exactly 3 relevant slokas (verses) from the Bhagavad Gita
4. Keep your response concise and focused on practical spiritual guidance

**Response Format (MUST be followed exactly):**
Briefly acknowledge the user's concern and provide spiritual guidance in 2-3 sentences.

**Recommended Slokas:**
Chapter X, Verse Y: [One sentence explaining why this verse is relevant]
Chapter X, Verse Y: [One sentence explaining why this verse is relevant]  
Chapter X, Verse Y: [One sentence explaining why this verse is relevant]

**Important Guidelines:**
- All responses must be in English only
- Only recommend verses that exist in the Bhagavad Gita (Chapters 1-18)
- Keep explanations brief and practical
- Focus on actionable spiritual wisdom
- Be compassionate and understanding
- Do not include Sanskrit text or translations in your response`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { text: `User Input: ${userMessage}` }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            }
        })
    });

    if (!response.ok) {
        throw new Error('API call failed');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
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

// Start app
init();