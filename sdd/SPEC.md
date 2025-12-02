# GitaGyan - Specification Document

> **Version**: 2.0.0  
> **Last Updated**: December 2024  
> **Status**: Production

---

## 1. Vision & Purpose

### 1.1 Problem Statement
Millions of spiritual seekers want to access the timeless wisdom of the Bhagavad Gita but face challenges:
- Traditional texts are difficult to navigate and understand
- No personalized guidance for applying verses to modern life situations
- Existing apps lack immersive audio experiences
- Most solutions require app store downloads and constant connectivity

### 1.2 Solution
GitaGyan is a Progressive Web App (PWA) that makes the Bhagavad Gita accessible, interactive, and personally relevant through:
- Complete 700 verses with multi-language translations
- AI-powered spiritual guidance (Sarthi AI)
- Professional Sanskrit audio recitations
- Offline-first architecture
- Native app experience without app store friction

### 1.3 Target Users
| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Spiritual Seekers | People exploring Vedantic wisdom | Daily inspiration & guidance |
| Students | Those studying Hindu philosophy | Reference & learning |
| Meditation Practitioners | Regular meditators | Contemplative reading |
| Scholars | Researchers of ancient texts | Accurate source material |
| Life Navigators | Anyone facing challenges | Practical wisdom application |

---

## 2. User Experience Specification

### 2.1 Core User Journeys

#### Journey 1: Browse & Read
```
User opens app → Views chapter list → Selects chapter → 
Reads verse in Sanskrit → Views translation → 
Swipes to next verse → Bookmarks favorite
```

#### Journey 2: Listen & Learn
```
User selects verse → Taps play button → Listens to Sanskrit recitation →
Audio ring shows progress → Auto-advances to next verse →
Continues listening while reading translations
```

#### Journey 3: Seek Guidance (Sarthi AI)
```
User taps AI button → Opens chat interface → Types life question →
AI analyzes and recommends relevant verse → User taps verse pill →
Navigates to full verse → Reads and reflects
```

#### Journey 4: Watch & Understand
```
User opens chapter → Taps video tab → Selects language (Hindi/English) →
Watches chapter explanation video → Returns to reading
```

### 2.2 Screen Specifications

#### Home Screen
- **Purpose**: Entry point and chapter navigation
- **Elements**:
  - App header with title and AI button
  - Scrollable chapter list (18 chapters)
  - Each chapter card shows: number, name, verse count
  - Bottom navigation (if applicable)

#### Chapter View
- **Purpose**: Display verses and video content
- **Elements**:
  - Chapter header with name and verse count
  - Video section with Hindi/English tabs
  - Verse slider for navigation
  - Current verse display with:
    - Sanskrit text (Devanagari)
    - Transliteration
    - Translation (Hindi/English/Gujarati)
  - Audio player with progress ring
  - Bookmark button
  - Swipe navigation

#### Sarthi AI Chat
- **Purpose**: AI-powered spiritual guidance
- **Elements**:
  - Full-screen glassmorphism overlay
  - Chat history with messages
  - Starter prompt pills
  - Input field with send button
  - Verse pills in AI responses (clickable)
  - Settings access for API key

#### Settings Modal
- **Purpose**: Configuration and personalization
- **Elements**:
  - Gemini API key input (secure)
  - Model selector dropdown
  - Save/Remove buttons
  - Bookmarks list
  - Reset cache option
  - Links to setup instructions

---

## 3. Functional Requirements

### 3.1 Content Display
| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Display all 18 chapters with metadata | Must Have |
| F1.2 | Show all 700 verses in Sanskrit | Must Have |
| F1.3 | Display Hindi translations | Must Have |
| F1.4 | Display English translations | Must Have |
| F1.5 | Display Gujarati translations | Should Have |
| F1.6 | Show transliterations for all verses | Must Have |
| F1.7 | Chapter-wise video explanations | Should Have |

### 3.2 Audio Features
| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Play Sanskrit audio for each verse | Must Have |
| F2.2 | Show audio progress ring | Should Have |
| F2.3 | Auto-advance to next verse | Should Have |
| F2.4 | Background audio playback | Should Have |
| F2.5 | Offline audio caching | Should Have |

### 3.3 AI Features (Sarthi AI)
| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Accept user questions about life | Must Have |
| F3.2 | Recommend relevant verses | Must Have |
| F3.3 | Provide contextual explanations | Must Have |
| F3.4 | Generate clickable verse pills | Must Have |
| F3.5 | Maintain conversation history | Should Have |
| F3.6 | Support multiple Gemini models | Should Have |
| F3.7 | Cache translation responses | Should Have |

### 3.4 Navigation
| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | Swipe left/right between verses | Must Have |
| F4.2 | Verse slider for quick navigation | Must Have |
| F4.3 | Back navigation (edge swipe) | Must Have |
| F4.4 | Deep linking to specific verses | Should Have |
| F4.5 | Breadcrumb navigation | Should Have |

### 3.5 Personalization
| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Bookmark/favorite verses | Must Have |
| F5.2 | View bookmarked verses list | Must Have |
| F5.3 | Remove bookmarks | Must Have |
| F5.4 | Persist user preferences | Must Have |
| F5.5 | Remember reading position | Should Have |

### 3.6 PWA Features
| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | Installable on home screen | Must Have |
| F6.2 | Offline content access | Must Have |
| F6.3 | Service worker caching | Must Have |
| F6.4 | App-like experience | Must Have |
| F6.5 | PWA install prompts | Should Have |

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Initial load time: < 3 seconds on 4G
- Time to interactive: < 2 seconds
- Audio start latency: < 500ms
- AI response time: < 5 seconds

### 4.2 Reliability
- 99.9% uptime for static content
- Graceful degradation when offline
- Error recovery for API failures

### 4.3 Security
- API keys stored locally only
- No server-side data storage
- HTTPS only

### 4.4 Accessibility
- Touch targets minimum 44x44px
- Proper contrast ratios
- Screen reader compatible

### 4.5 Compatibility
- iOS Safari 14+
- Android Chrome 80+
- Desktop modern browsers

---

## 5. Data Specifications

### 5.1 Chapter Data Structure
```json
{
  "chapter_number": 1,
  "name": "अर्जुनविषादयोग",
  "name_transliterated": "Arjuna Vishada Yoga",
  "name_meaning": "Arjuna's Dilemma",
  "verses_count": 47,
  "summary": "..."
}
```

### 5.2 Verse Data Structure
```json
{
  "chapter": 1,
  "verse": 1,
  "sloka": "धृतराष्ट्र उवाच...",
  "transliteration": "dhṛtarāṣṭra uvāca...",
  "word_meanings": "...",
  "translation": {
    "hindi": "...",
    "english": "...",
    "gujarati": "..."
  },
  "audio_url": "..."
}
```

### 5.3 LocalStorage Keys
| Key | Purpose | Format |
|-----|---------|--------|
| `geminiApiKey` | Gemini API key | String |
| `geminiModel` | Selected model | String |
| `favorites` | Bookmarked verses | JSON Array |
| `sarthiChatHistory` | AI chat history | JSON Array |
| `sarthi_chapter_X` | Cached translations | JSON |

---

## 6. Design Specifications

### 6.1 Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Red | #A5252C | Headers, accents, active states |
| Golden Yellow | #E6A623 | Secondary actions, highlights |
| Brown Text | #5D4037 | Body text |
| Background | Yellow gradient | App background |

### 6.2 Typography
- **Headers**: Roboto Bold
- **Body**: Roboto Regular
- **Sanskrit**: Devanagari-compatible fonts

### 6.3 Design Language
- Glassmorphism with backdrop blur
- Rounded corners (12-20px)
- Subtle shadows
- Gradient accents

---

## 7. Success Metrics

### 7.1 Engagement
- Daily active users
- Average session duration > 5 minutes
- Verses read per session > 10
- AI queries per user per week

### 7.2 Retention
- 7-day retention > 30%
- PWA installation rate > 20%
- Bookmark usage rate > 40%

### 7.3 Performance
- Core Web Vitals passing
- < 1% error rate on API calls
- 100% offline functionality

---

*This specification serves as the source of truth for GitaGyan development.*
