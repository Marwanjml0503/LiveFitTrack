# Angular Firebase Authentication App

A simple login and register application built with Angular and Firebase Authentication.

## Features

- 🔐 User Registration with username, email, and password
- 🔑 User Login with email and password
- 👤 Profile Management
  - Edit username
  - Change password
  - Delete account
- 🎨 Clean and simple user interface
- 💾 Data stored in Firebase Firestore

## Tech Stack

- **Frontend**: Angular 17+
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Styling**: CSS

## Setup Instructions

### 1. Firebase Setup

1. Create a new project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
3. Enable Firestore:
   - Go to **Firestore Database**
   - Create database in **test mode**

### 2. Environment Configuration

Update `src/environments/environment.ts` with your Firebase config:

```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  }
};