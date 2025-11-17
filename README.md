# TaskTrack - Mobile Task Management App

## Application Overview
LiveFitTrack is a beautiful mobile fitness management application built with Ionic Angular and Firebase, developed for Raffles University Mobile Application Development Assignment 2.

## Features
-  *User Authentication* - Simple login system
-  *CRUD Operations* - Create, Read, Update, Delete tasks
-  *Real-time Data Sync* - Firebase Firestore integration
-  *Client-side Caching* - Offline data persistence
-  *Mobile-first UI* - Ionic components and responsive design
-  *Task Management* - Priority levels, due dates, status tracking

## Technology Stack
- *Frontend*: Ionic Angular
- *Backend*: Firebase Firestore
- *Authentication*: Demo login system
- *Caching*: LocalStorage implementation
- *UI Framework*: Ionic Components

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Steps to Run
1. *Download and extract* the firebaseapp.zip file
2. *Open terminal/command prompt* in the extracted project directory
3. *Install dependencies*:
   bash
   npm install
   
4. *Run the application*:
   bash
   ionic serve
   
5. *Open browser* and navigate to http://localhost:8100

## Demo Credentials
- *Email*: *****@.com
- *Password*: 123456

## Assignment Requirements Fulfilled

### Task 1: Firebase Integration 
- Firebase project setup and configuration
- Firestore database in test mode
- Real-time data synchronization

### Task 2: CRUD Operations 
- *Create*: Add new tasks to Firestore
- *Read*: Real-time task list display
- *Update*: Edit task status and details
- *Delete*: Swipe to delete tasks

### Task 3: Client-side Caching 
- LocalStorage implementation
- Instant data load on app startup
- Offline viewing capability

## Project Structure

tasktrack-app/
├── src/
│   ├── app/
│   │   ├── home/                 # Main application page
│   │   ├── services/            # Task and storage services
│   │   └── environments/        # Firebase configuration
│   └── assets/                  # Static resources
├── package.json                 # Dependencies
├── angular.json                # Angular configuration
├── ionic.config.json           # Ionic configuration
└── tsconfig.json               # TypeScript configuration

