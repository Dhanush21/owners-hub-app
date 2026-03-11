import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Gemini API
// Using 'gemini-1.5-flash-latest' as it's more reliable in some environments
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Project Context: Owners Hub (Property & Society Management)
const APP_TOPIC = "Owners Hub (also known as CoHub), a property and society management application. Features include managing residents, tracking payments, viewing subscriptions, and handling notifications.";

// Page Routes Mapping
const PAGES = {
    "Dashboard": "/",
    "Residents": "/residents",
    "Payments": "/payments",
    "Subscriptions": "/subscriptions",
    "Notifications": "/notifications",
    "Profile": "/profile",
    "Settings": "/settings",
    "Login": "/auth",
    "Register": "/auth"
};

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        const prompt = `
      You are the AI Help Assistant for Owners Hub, a property and society management platform.
      
      Rules:
      1. If the user explicitly asks to "open", "go to", or "navigate to" a page (Dashboard, Residents, Payments, etc.), respond ONLY with: { "action": "redirect", "page": "page_name" }.
      2. If the user asks a question about data (how many, what is, total, status, etc.) or app features, provide a helpful and concise answer. Do NOT redirect for these.
      3. If the user asks anything completely unrelated to property management or the Owners Hub app, respond with exactly: "Please ask questions related to the topic of this app."
      4. Always return structured JSON for redirects, and plain text for conversational answers.

      Current User Message: "${message}"
      
      Owners Hub Context: ${APP_TOPIC}
      Available Pages: ${Object.keys(PAGES).join(", ")}
    `;

        // Multi-model fallback for quota management
        const models = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.0-pro"
        ];

        let responseText = "";
        let success = false;
        let lastError = null;
        let isRateLimit = false;

        for (const modelName of models) {
            console.log(`Attempting request with ${modelName}...`);
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await geminiResponse.json();

                if (geminiResponse.ok) {
                    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                    if (responseText) {
                        success = true;
                        console.log(`Success with ${modelName}`);
                        break;
                    }
                } else {
                    const errMsg = data.error?.message || `Status ${geminiResponse.status}`;
                    console.log(`${modelName} error: ${errMsg}`);
                    lastError = errMsg;
                    if (geminiResponse.status === 429) isRateLimit = true;
                    if (geminiResponse.status === 429 || geminiResponse.status === 404) continue;
                    break; // Stop for other types of errors
                }
            } catch (err) {
                console.error(`Error with ${modelName}:`, err.message);
                lastError = err.message;
                continue;
            }
        }

        if (!success) {
            if (isRateLimit) {
                return res.status(429).json({
                    error: "Rate limit exceeded",
                    details: "All AI free-tier models are temporarily busy. Please wait about 60 seconds and try again."
                });
            }
            throw new Error(lastError || "All free-tier models failed.");
        }

        // Try to parse as JSON if it looks like JSON
        if (responseText.includes("{") && responseText.includes("}")) {
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonResponse = JSON.parse(jsonMatch[0]);
                    return res.json(jsonResponse);
                }
            } catch (e) { }
        }

        res.json({ response: responseText });

    } catch (error) {
        console.error("AI Error:", error.message);
        if (error.message.includes("429")) {
            return res.status(429).json({
                error: "Rate limit exceeded",
                details: "The AI service is temporarily busy. Please wait a minute and try again."
            });
        }
        res.status(500).json({ error: "AI processing error", details: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: "ok", app: "Owners Hub Backend" });
});

app.listen(port, () => {
    console.log(`Owners Hub Backend listening at http://localhost:${port}`);
});
