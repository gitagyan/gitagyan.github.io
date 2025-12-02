# GitaGyan - Spec-Driven Development

This folder contains the specification-driven development (SDD) documentation for the GitaGyan Bhagavad Gita PWA.

## 📁 Document Structure

| Document | Purpose |
|----------|---------|
| [SPEC.md](./SPEC.md) | **Specification** - What we're building and why. User journeys, functional requirements, and success metrics. |
| [PLAN.md](./PLAN.md) | **Technical Plan** - How we're building it. Architecture, technology stack, and module specifications. |
| [TASKS.md](./TASKS.md) | **Task Breakdown** - Implementation checklist organized by phase/version. |
| [CHANGELOG.md](./CHANGELOG.md) | **Version History** - What was released in each version with features and improvements. |

## 🔄 SDD Workflow

Following the [Spec Kit](https://github.com/github/spec-kit) methodology:

```
1. SPECIFY → Define what to build (user experience, requirements)
2. PLAN    → Define how to build (architecture, technology)
3. TASKS   → Break into actionable work items
4. IMPLEMENT → Code with AI assistance, referencing spec
```

## 🎯 Using These Documents

### For New Features
1. Update SPEC.md with user journey and requirements
2. Update PLAN.md with technical approach
3. Add tasks to TASKS.md
4. Implement and mark tasks complete
5. Document in CHANGELOG.md

### For Bug Fixes
1. Log bug in TASKS.md (Bug Fixes Log)
2. Reference spec to understand expected behavior
3. Fix and mark complete
4. Update CHANGELOG.md if significant

### For AI-Assisted Development
When working with GitHub Copilot, Claude, or other AI:
- Reference SPEC.md for "what" questions
- Reference PLAN.md for "how" questions
- Use TASKS.md for focused implementation prompts

## 📊 Current Status

**Version**: 2.0.0  
**Phase**: 7 (Complete Experience) ✅  
**Next Phase**: 8 (Future Enhancements)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│              GitaGyan PWA               │
├─────────────────────────────────────────┤
│  Frontend: Vanilla JS + HTML5 + CSS3    │
│  AI: Google Gemini API                  │
│  Storage: LocalStorage + Service Worker │
│  Hosting: GitHub Pages                  │
└─────────────────────────────────────────┘
```

## 📱 Core Features Summary

- **700 Verses** in Sanskrit with translations
- **Audio** for every verse
- **Sarthi AI** for spiritual guidance
- **Videos** for chapter explanations
- **Bookmarks** for favorite verses
- **PWA** for offline, installable experience

---

*Spec-driven development ensures intent is captured before code is written.*
