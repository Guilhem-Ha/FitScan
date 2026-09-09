# FitScan
 
> AI-powered fitness app that generates personalized workout sessions by scanning your gym equipment.
 
---
 
## Overview
 
FitScan is a mobile application built with React Native and Expo. Point your camera at any piece of gym equipment and the app instantly identifies it using Google Gemini Vision AI, then generates a complete, personalized workout session tailored to your level, goal, and available gear.
 
---
 
## Features
 
- ** Equipment Scanner** — Take photos of your equipment and let AI identify everything automatically, including multiple items per photo
- ** Workout Generator** — Get a full session with exercises, sets, reps, rest times and YouTube execution videos
- ** Bodyweight Mode** — No equipment? Train anywhere with a bodyweight-only session
- ** Quick Scan** — Instantly get exercise suggestions for any single piece of equipment
- ** Weight Tracking** — Log the weight used for each exercise and get progressive overload suggestions (+2.5kg)
- ** Progress Screen** — Track sessions, total training time, and most-worked muscle groups
- ** Onboarding** — Instagram-style story slides for first-time users
 
---
 
## Tech Stack
 
| Technology | Usage |
|---|---|
| React Native + Expo | Mobile framework |
| Google Gemini Vision API | Equipment identification & workout generation |
| AsyncStorage | Local data persistence |
| React Navigation | Stack + custom tab navigation |
| react-native-pager-view | Swipeable tab navigation |
| Expo Google Fonts | Bebas Neue + DM Sans typography |
| Unsplash API | Equipment reference images |
 
---
 
## 🚀 Getting Started
 
### Prerequisites
 
- Node.js 20+
- Expo CLI
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
 
### Installation
 
```bash
git clone https://github.com/yourusername/fitscan.git
cd fitscan
npm install
```
 
### Environment Setup
 
Create a `.env` file at the root of the project:
 
```
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```
 
### Run
 
```bash
npx expo start
```
 
---
 
## 📂 Project Structure
 
```
fitscan/
├── App.js                  # Navigation + onboarding
├── theme.js                # Design system (colors, radii, elevation, typography)
├── ui/
│   └── kit.js              # Shared components (Press, Card, buttons, Ring…)
├── screens/
│   ├── HomeScreen.js       # Session history
│   ├── NewSessionScreen.js # Session configuration
│   ├── ScanScreen.js       # Equipment scanning
│   ├── WorkoutScreen.js    # Active workout
│   ├── QuickScanScreen.js  # Quick exercise suggestions
│   ├── ProgressScreen.js   # Stats & progress
│   └── OnboardingScreen.js # First launch stories
├── services/
│   └── geminiService.js    # Gemini AI calls
└── data/
    └── storage.js          # AsyncStorage helpers
```
 
---
 
 
## Expo project slug

The `slug` in `app.json` still reads `snack-01f4690b-…`, inherited from the
original Expo Snack. It cannot be changed: a `projectId` is bound to a single
slug for good ([expo.fyi/eas-project-id](https://expo.fyi/eas-project-id)), and
EAS rejects any build whose `app.json` disagrees. Renaming the project on the
dashboard only changes its display name, which is now **FitScan**.

Nothing user-facing depends on it — the app is named FitScan, the Android
package is `com.guiha.fitscan`, and update URLs key off the `projectId`. The
slug only appears in `expo.dev` URLs.

---

## API Keys
 
This app uses the **Google Gemini API** (free tier available).  
 
---
 
## 📄 License
 
MIT License — feel free to use, modify and distribute.
 
---
 
Made by Guilhem
