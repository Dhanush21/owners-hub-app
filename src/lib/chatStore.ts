export interface Message {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    isAnimating?: boolean;
}

// Global in-memory state to persist chats during navigation (wiped on refresh/close)
let globalChatMessages: Message[] = [];
let globalChatId: string | null = null;
let globalHasAttemptedLoad: boolean = false; // Add flag so we only try to load from Firebase once per session if possible

export const getGlobalChatMessages = () => globalChatMessages;
export const getGlobalChatId = () => globalChatId;
export const getGlobalHasAttemptedLoad = () => globalHasAttemptedLoad;

export const setGlobalChatState = (messages: Message[], chatId: string | null, hasAttemptedLoad: boolean = globalHasAttemptedLoad) => {
    globalChatMessages = messages;
    globalChatId = chatId;
    globalHasAttemptedLoad = hasAttemptedLoad;
};

// If there's more than the initial greeting message, or the user sent a message
export const hasActiveChat = () => {
    return globalChatMessages.length > 1;
};

export const clearGlobalChatState = () => {
    globalChatMessages = [];
    globalChatId = null;
    // We keep hasAttemptedLoad as is so we don't fetch again if we just cleared
};
