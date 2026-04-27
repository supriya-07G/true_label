<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# True Label

**Your Intelligent, Personalized Food and Medicine Safety Companion**
</div>

## 📌 Overview
True Label is a highly personalized Web Application designed to analyze product labels (food and medicine) against a user's specific health profile. By mapping allergies, chronic illnesses, medications, and health goals, it automatically determines safety ratings and checks for dangerous drug-food or drug-drug interactions.

## ✨ Core Features
- **Personalized Safety Scanning**: Upload product labels to get an instant safety report (Green/Yellow/Red) tailored exclusively to your health profile.
- **Health Cabinet**: Digitally manage your household food and medicine inventory.
- **Interaction Checker**: Automatically cross-reference new scanned items against your cabinet inventory for dangerous interactions.
- **AI Health Assistant**: Ask questions and get context-aware answers in English, Hindi, or Telugu.

## 🛠️ Technology Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons
- **Backend / BaaS**: Firebase (Authentication & Firestore)
- **Intelligence**: Google Gemini (gemini-3-flash API)

## 🚀 Run Locally

**Prerequisites:** Node.js (v18+)

1. Clone the repository and navigate to the project directory.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   - Create a `.env` or `.env.local` file in the root directory.
   - Add your Gemini API key and Firebase configurations (refer to `.env.example` if available):
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## 📐 System Architecture

Below is the PlantUML Architecture Diagram detailing how the components of True Label interact in a strict Top-Down hierarchical flow:

```plantuml
@startuml TrueLabelArchitecture
skinparam defaultTextAlignment center
skinparam shadowing false
skinparam RoundCorner 10
skinparam ArrowColor #708090
skinparam ArrowThickness 1.5

' Font Settings
skinparam defaultFontName Arial
skinparam defaultFontSize 14

' Node (Container) Styling
skinparam node {
    BackgroundColor #F8FAFC
    BorderColor #CBD5E1
    BorderThickness 1.5
    FontColor #334155
    FontSize 16
    FontStyle bold
}

' Component Styling
skinparam component {
    BackgroundColor #E6F3F7
    BorderColor #007BA7
    BorderThickness 2
    FontColor #0F172A
}

' External Database Styling
skinparam database {
    BackgroundColor #F0F9FF
    BorderColor #007BA7
    BorderThickness 2
    FontColor #0F172A
}

' Actor Styling
skinparam actor {
    BackgroundColor #007BA7
    BorderColor #005370
    FontColor #0F172A
}

title "True Label System Architecture"

actor "End User" as User

node "Client Tier (React SPA)" {
    component "UI Components\n(React, Tailwind, Lucide)" as UI
    component "App State & React Hooks" as State
}

node "Service Tier (Core Logic)" {
    component "Gemini API Service\n(geminiService.ts)" as GeminiService
    component "Firebase Manager\n(firebaseService.ts)" as FirebaseService
}

node "Cloud Infrastructure & APIs" {
    component "Google Gemini API\n(Gemini-3-Flash)" as GeminiAPI
    component "Firebase Authentication" as FirebaseAuth
    database "Firestore Database\n(Users, Cabinet, History)" as Firestore
}

' Strict Top-Down Data Flow
User -down-> UI : " Interacts with Web/Mobile View"
UI -down-> State : " User Events & Input"

State -down-> GeminiService : " AI Prompt & Image Processing"
State -down-> FirebaseService : " Data Storage & Retrieval"

GeminiService -down-> GeminiAPI : " External HTTP Analysis Request"
FirebaseService -down-> FirebaseAuth : " Session Authentication"
FirebaseService -down-> Firestore : " NoSQL Document Storage"

' Symmetry Enforcement
UI -[hidden]right- State
GeminiService -[hidden]right- FirebaseService
GeminiAPI -[hidden]right- FirebaseAuth
FirebaseAuth -[hidden]right- Firestore

@enduml
```

