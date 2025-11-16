// Sarthi AI Functions - Chat and Translation
// This module handles all Sarthi AI functionality including chat and enhanced translations

// Global variables for Sarthi
let geminiApiKey = null;
let sarthiLanguage = 'english'; // Default language for Sarthi translations

// Gemini API Model Configuration
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_TRANSLATION_MODEL = 'gemini-2.5-flash-lite';

// Initialize Sarthi AI
function initSarthi() {
    // Check if API key exists in localStorage
    geminiApiKey = localStorage.getItem('geminiApiKey');
    
    // Setup AI button click handler
    const aiBtn = document.getElementById('ai-btn');
    if (aiBtn) {
        aiBtn.addEventListener('click', handleAIButtonClick);
    }
    
    // Setup API key save functionality
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
    
    const toggleApiKeyBtn = document.getElementById('toggle-api-key-visibility');
    if (toggleApiKeyBtn) {
        toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    }
    
    // Setup chat functionality
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    const chatInput = document.getElementById('ai-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Setup starter prompts
    document.querySelectorAll('.starter-prompt').forEach(prompt => {
        prompt.addEventListener('click', () => {
            const message = prompt.getAttribute('data-prompt');
            document.getElementById('ai-chat-input').value = message;
            sendMessage();
        });
    });
    
    // Setup clear chat button
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat history?')) {
                clearChatHistory();
                initializeChatScreen();
            }
        });
    }
    
    // Setup Sarthi translate
    setupSarthiTranslate();
}

// Handle AI button click
function handleAIButtonClick() {
    if (geminiApiKey) {
        // Show chat screen - access switchScreen from global scope
        if (typeof window.switchScreen === 'function') {
            const aiChatScreen = document.getElementById('ai-chat-screen');
            window.switchScreen(aiChatScreen);
            initializeChatScreen();
            // Ensure starter prompts are visible by default
            setTimeout(() => {
                const starterPrompts = document.getElementById('ai-starter-prompts');
                if (starterPrompts) {
                    starterPrompts.style.display = 'flex';
                }
            }, 100);
        }
    } else {
        // Show setup screen
        if (typeof window.switchScreen === 'function') {
            const aiSetupScreen = document.getElementById('ai-setup-screen');
            window.switchScreen(aiSetupScreen);
        }
    }
}

// Save API key
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
    const aiChatScreen = document.getElementById('ai-chat-screen');
    if (typeof window.switchScreen === 'function') {
        window.switchScreen(aiChatScreen);
        initializeChatScreen();
    }
}

// Toggle API key visibility
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

// Initialize chat screen
function initializeChatScreen() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const starterPrompts = document.getElementById('ai-starter-prompts');
    
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
    
    if (!hasUserMessages) {
        // Show starter prompts if no user messages
        starterPrompts.style.display = 'flex';
    } else {
        // Hide starter prompts if we have user messages
        starterPrompts.style.display = 'none';
    }
}

// Check for user messages
function checkForUserMessages() {
    const savedHistory = localStorage.getItem('sarthiChatHistory');
    if (!savedHistory) return false;
    
    const messages = JSON.parse(savedHistory);
    return messages.some(message => message.sender === 'user');
}

// Send message
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

// Call Gemini API
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
    
    // Check if candidates array exists and has content
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from AI service');
    }
    
    const candidate = data.candidates[0];
    
    // Check if candidate has content
    if (!candidate.content) {
        throw new Error('AI service returned empty response');
    }
    
    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
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
    
    // Check if part has text
    if (!part.text) {
        throw new Error('AI service returned no text');
    }
    
    return part.text.trim();
}

// Display sloka response
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

// Add message to chat
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

// Navigate to sloka
function navigateToSloka(slokaRef) {
    // Parse chapter.verse format
    const [chapterNum, verseNum] = slokaRef.split('.').map(n => parseInt(n));
    
    // Get chapters and verses from global scope
    const chapters = window.chaptersData || [];
    const verses = window.versesData || [];
    
    // Find the chapter and verse
    const chapter = chapters.find(c => c.chapter_number === chapterNum);
    const verse = verses.find(v => v.chapter_number === chapterNum && v.verse_number === verseNum);
    
    if (chapter && verse) {
        // Set current chapter and verse in global scope
        window.currentChapter = chapter;
        window.currentVerse = verse;
        
        // Navigate to verse detail screen using global showVerse function
        if (typeof window.showVerse === 'function') {
            window.showVerse(verse);
        }
    } else {
        alert('Sloka not found. Please try again later.');
    }
}

// Show typing indicator
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

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator-message');
    if (typingIndicator) {
        typingIndicator.remove();
    }
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
    
    // Access currentVerse from global scope (defined in app.js)
    const currentVerse = window.currentVerse;
    
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
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 8px; border-radius: 14px; font-size: 9px; font-weight: 600;">
                        ✨ SarthiAI Enhanced (${displayLanguage})
                    </div>
                    <button id="sarthi-settings-btn" style="background: #E6A623; border: none; padding: 4px 8px; border-radius: 14px; font-size: 9px; cursor: pointer; display: flex; align-items: center; gap: 3px; color: #A5252C; font-weight: 600; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12); transition: all 0.3s ease;">
                        <i class="fas fa-cog" style="font-size: 8px;"></i> Change Language
                    </button>
                </div>
                <div>${parseMarkdown(aiSummary)}</div>
            `;
            
            // Make floating audio button semi-transparent
            const floatingAudioBtn = document.getElementById('floating-audio-btn');
            if (floatingAudioBtn) {
                floatingAudioBtn.style.opacity = '0.7';
            }
            
            // Add click handler for settings button
            setTimeout(() => {
                const settingsBtn = document.getElementById('sarthi-settings-btn');
                if (settingsBtn) {
                    settingsBtn.addEventListener('click', () => {
                        const settingsScreen = document.getElementById('settings-screen');
                        if (settingsScreen && typeof window.switchScreen === 'function') {
                            window.switchScreen(settingsScreen);
                        }
                    });
                }
            }, 100);
            
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
    
    const prompt = `You are an AI spiritual guide. Provide a deep, spiritually-aligned meaning of this Bhagavad Gita verse in ${languageName}:

Chapter ${verse.chapter_number}, Verse ${verse.verse_number}:
Sanskrit: ${verse.text}

You must follow this EXACT FORMAT (do not include chapter/verse numbers in your response):

[First paragraph: Brief meaning of the verse in 1-2 sentences]

Core Teaching: [Deep spiritual insight explaining the essence and practical wisdom of this teaching in 2-3 sentences]

CRITICAL REQUIREMENTS:
- Maximum 150 words total
- Do NOT include the sloka/verse text itself
- Do NOT mention chapter or verse numbers
- Focus on deep spiritual meaning and practical application
- Response must be ONLY in ${languageName} language
- If Hindi, use Devanagari script; if Gujarati, use Gujarati script
- Do not mix languages or use English words unless absolutely necessary`;

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
    
    // Check if candidates array exists and has content
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Sarthi AI service');
    }
    
    const candidate = data.candidates[0];
    
    // Check if candidate has content
    if (!candidate.content) {
        throw new Error('Sarthi AI service returned empty response');
    }
    
    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Sarthi AI service returned malformed response');
    }
    
    const part = candidate.content.parts[0];
    
    // Check if part has text
    if (!part.text) {
        throw new Error('Sarthi AI service returned no text');
    }
    
    const aiResponse = part.text;
    
    // Cache the response in chapter-based structure
    chapterCache[verseKey] = aiResponse;
    localStorage.setItem(chapterCacheKey, JSON.stringify(chapterCache));
    
    return aiResponse;
}

// Export functions to window
window.AppSarthi = {
    initSarthi,
    handleSarthiAIPillClick,
    getSarthiTranslation,
    navigateToSloka
};
