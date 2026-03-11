# Owners Hub Backend

This is the backend server for the Owners Hub Help Bot.

## Setup

1.  Navigate into the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Add your Gemini API key in `.env`:
    ```bash
    GEMINI_API_KEY=your_key_here
    ```
4.  Start the server:
    ```bash
    npm start
    ```

## Features

- `/api/chat`: Processes chat messages with Gemini AI.
- Implements redirect logic for app features.
- Filters out non-app-related questions.
- Built for Owners Hub (Property/Society Management).
