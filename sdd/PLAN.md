# GitaGyan - Technical Plan

> **Version**: 2.0.0  
> **Last Updated**: December 2024  
> **Architecture**: Client-Side PWA

---

## 1. Technology Stack

### 1.1 Frontend
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| Vanilla JavaScript (ES6+) | Core logic | No framework overhead, fast loading |
| HTML5 | Structure | Semantic markup, PWA support |
| CSS3 | Styling | Glassmorphism, animations |
| FontAwesome | Icons | Consistent, accessible icons |

### 1.2 APIs & Services
| Service | Purpose | Integration |
|---------|---------|-------------|
| Google Gemini API | AI responses | REST API via user's key |
| GitHub Pages | Hosting | Static file hosting |
| Service Worker API | Offline support | Browser native |

### 1.3 Data Storage
| Storage | Purpose | Scope |
|---------|---------|-------|
| LocalStorage | User preferences, API keys | Persistent |
| Service Worker Cache | Static assets, JSON data | Persistent |
| Session memory | Current state | Session |

---

## 2. Architecture

### 2.1 File Structure
```
gitagyan.github.io/
├── index.html              # Main app entry
├── setup-instructions.html # Onboarding guide
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── favicon.ico
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # Main app logic
│   └── app-saarthi.js      # AI chat logic
├── assets/
│   ├── chapters.json       # Chapter metadata
│   ├── verse.json          # All verses data
│   ├── youtube_videos.json # Video references
│   └── verse_translation/  # Chapter-wise translations
│       ├── chapter_1.json
│       └── ... (18 files)
├── images/
│   ├── icon-192.png        # PWA icons
│   ├── icon-512.png
│   ├── app-icon.png
│   ├── SarthiAI.png
│   ├── krishna-and-arjuna.jpg
│   ├── yellow_bg.png
│   └── screenshots/        # Setup guide images
└── sdd/                    # Specification docs
```

### 2.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Header                                ││
│  │  [Logo]  [Title]              [AI Button]                ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Main Content                            ││
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐│
│  │  │  Chapter List   │  │       Verse View                ││
│  │  │  (Home Screen)  │  │  ┌───────────────────────────┐  ││
│  │  │                 │  │  │   Video Section           │  ││
│  │  │  ┌───────────┐  │  │  │   [Hindi] [English]       │  ││
│  │  │  │ Chapter 1 │  │  │  └───────────────────────────┘  ││
│  │  │  │ Chapter 2 │  │  │  ┌───────────────────────────┐  ││
│  │  │  │ ...       │  │  │  │   Verse Display           │  ││
│  │  │  │ Chapter 18│  │  │  │   Sanskrit + Translation  │  ││
│  │  │  └───────────┘  │  │  └───────────────────────────┘  ││
│  │  └─────────────────┘  │  ┌───────────────────────────┐  ││
│  │                       │  │   Audio Player            │  ││
│  │                       │  │   [Progress Ring] [Play]  │  ││
│  │                       │  └───────────────────────────┘  ││
│  │                       └─────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Sarthi AI Overlay (Full Page)               ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │  Chat Messages                                    │  ││
│  │  │  [User] How do I deal with stress?                │  ││
│  │  │  [AI] The Gita offers wisdom... [2.47] [2.48]     │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │  [Input field]                    [Send]          │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Settings Modal                              ││
│  │  API Key: [••••••••••••]  [Save]                        ││
│  │  Model: [Dropdown]                                       ││
│  │  Bookmarks: [List of saved verses]                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│   app.js     │────▶│  DOM Update  │
│  Interaction │     │   Logic      │     │  Rendering   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ LocalStorage │
                    │  (State)     │
                    └──────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ JSON Assets  │   │ Audio Files  │   │ Gemini API   │
│ (Cached)     │   │ (CDN/Cached) │   │ (External)   │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 3. Module Specifications

### 3.1 app.js - Main Application

**Responsibilities:**
- Chapter list rendering
- Verse navigation and display
- Audio player control
- Bookmark management
- Settings modal
- Touch/swipe handling

**Key Functions:**
```javascript
// Core Navigation
function loadChapters()           // Fetch and display chapters
function loadVerses(chapterNum)   // Load verses for chapter
function showVerse(verseNum)      // Display specific verse
function navigateVerse(direction) // Next/previous verse

// Audio
function playAudio(audioUrl)      // Play verse audio
function updateAudioProgress()    // Update progress ring

// Bookmarks
function toggleBookmark(chapter, verse)
function loadBookmarks()
function saveBookmarks()

// Settings
function openSettings()
function saveApiKey()
function loadSettings()
```

### 3.2 app-saarthi.js - AI Chat Module

**Responsibilities:**
- Chat interface management
- Gemini API communication
- Response parsing and verse extraction
- Conversation history management
- Translation caching

**Key Functions:**
```javascript
// Chat Management
function openSarthiChat()         // Open AI overlay
function closeSarthiChat()        // Close AI overlay
function sendMessage(message)     // Send to Gemini API

// API Communication
function callGeminiAPI(prompt)    // Make API request
function parseResponse(response)  // Extract text and verses

// Verse Detection
function displaySlokaResponse(text)  // Parse and render verse pills
function navigateToSloka(chapter, verse)  // Navigate to verse

// History
function getConversationHistory() // Get last 10 exchanges
function addToConversationHistory(role, content)
function clearConversationHistory()

// Translation Caching
function getCachedTranslation(chapter)
function cacheTranslation(chapter, data)
function resetSarthiTranslations()
```

### 3.3 sw.js - Service Worker

**Responsibilities:**
- Cache static assets
- Intercept network requests
- Provide offline fallbacks
- Cache audio files dynamically

**Caching Strategy:**
```javascript
// Static assets - Cache First
const staticAssets = [
  '/', '/index.html', '/css/styles.css',
  '/js/app.js', '/js/app-saarthi.js',
  '/assets/chapters.json', '/assets/verse.json',
  // ... all JSON and images
];

// Audio files - Network First, Cache Fallback
// Dynamic caching for audio URLs

// API calls - Network Only
// Gemini API calls are never cached
```

---

## 4. API Integration

### 4.1 Gemini API Configuration

**Endpoint:**
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**Supported Models:**
| Model ID | Name | Use Case |
|----------|------|----------|
| gemini-2.5-flash-lite | Flash Lite | Fast, economical |
| gemini-2.5-flash | Flash | Balanced |
| gemini-2.5-pro | Pro | Complex queries |

**Request Format:**
```javascript
{
  contents: [
    { role: "user", parts: [{ text: "..." }] },
    { role: "model", parts: [{ text: "..." }] }
  ],
  generationConfig: {
    maxOutputTokens: 1500,
    temperature: 0.7
  }
}
```

**System Prompt:**
```
You are Sarthi, a wise spiritual guide well-versed in the Bhagavad Gita.
When users ask about life situations, recommend relevant verses.
Format verse references as Chapter X Verse Y or X.Y format.
Explain how the verse wisdom applies to their situation.
```

---

## 5. Performance Optimizations

### 5.1 Loading Strategy
1. **Critical Path**: HTML → CSS → Core JS
2. **Deferred**: JSON data, images
3. **Lazy**: Audio files, screenshots

### 5.2 Caching Layers
| Layer | TTL | Content |
|-------|-----|---------|
| Service Worker | Persistent | Static assets |
| LocalStorage | Persistent | User data |
| Memory | Session | Current state |

### 5.3 Asset Optimization
- Images: Compressed PNG/JPEG
- JSON: Minified production
- Audio: Streaming from CDN

---

## 6. Error Handling

### 6.1 API Errors
```javascript
try {
  const response = await callGeminiAPI(prompt);
} catch (error) {
  if (error.message.includes('API_KEY')) {
    showError('Please check your API key in settings');
  } else if (error.message.includes('RATE_LIMIT')) {
    showError('Too many requests. Please wait.');
  } else {
    showError('Something went wrong. Try again.');
  }
}
```

### 6.2 Offline Handling
- Show cached content
- Disable AI features gracefully
- Queue bookmarks for sync

---

## 7. Security Considerations

### 7.1 API Key Security
- Stored in LocalStorage (client-only)
- Never transmitted to our servers
- User responsible for key security

### 7.2 Content Security
- All content served over HTTPS
- No inline scripts (CSP ready)
- Sanitized user inputs

---

## 8. Deployment

### 8.1 Hosting
- **Platform**: GitHub Pages
- **Domain**: gitagyan.github.io
- **SSL**: Automatic via GitHub

### 8.2 CI/CD
- Push to main → Auto deploy
- No build step required
- Static file serving

### 8.3 Versioning
- Cache version in sw.js
- Increment on each release
- Force refresh on version change

---

*This plan guides the technical implementation of GitaGyan.*
