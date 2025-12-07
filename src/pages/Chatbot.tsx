import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, orderBy, query, where, limit, startAfter, doc, getDoc, addDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  isAnimating?: boolean;
}

const Chatbot = () => {
  const { user, userProfile, isGuest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hi${isGuest ? '' : `, ${userProfile?.fullName || 'there'}`}! I'm your Owners Hub assistant. I can answer questions about your app data (like payments) and help you navigate to sections such as Payments, Residents, or the Dashboard.${isGuest ? ' Note: You\'re browsing as a guest with limited access.' : ''}`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Gemini API configuration
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  // Chat persistence functions
  const saveMessage = async (message: Message) => {
    if (!user || isGuest) return;
    
    try {
      const chatRef = collection(db, "chats");
      const messageData = {
        content: message.content,
        sender: message.sender,
        timestamp: serverTimestamp(),
        userId: user.uid,
        chatId: currentChatId
      };
      
      if (currentChatId) {
        // Add message to existing chat
        await addDoc(collection(db, "chats", currentChatId, "messages"), messageData);
        
        // Update chat's updatedAt timestamp
        const chatDocRef = doc(db, "chats", currentChatId);
        await updateDoc(chatDocRef, {
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new chat and add message
        const newChatRef = await addDoc(chatRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          title: message.content.substring(0, 50) + (message.content.length > 50 ? "..." : "")
        });
        
        setCurrentChatId(newChatRef.id);
        await addDoc(collection(db, "chats", newChatRef.id, "messages"), messageData);
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const loadChatHistory = async () => {
    if (!user || isGuest) {
      setIsLoadingChat(false);
      return;
    }
    
    try {
      const chatsRef = collection(db, "chats");
      const userChatsQuery = query(chatsRef, where("userId", "==", user.uid));
      const chatsSnapshot = await getDocs(userChatsQuery);
      
      if (!chatsSnapshot.empty) {
        // Get the most recent chat by comparing timestamps
        let latestChat = chatsSnapshot.docs[0];
        let latestTime = latestChat.data().updatedAt || latestChat.data().createdAt;
        
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data();
          const chatTime = chatData.updatedAt || chatData.createdAt;
          if (chatTime && chatTime > latestTime) {
            latestChat = chatDoc;
            latestTime = chatTime;
          }
        }
        
        setCurrentChatId(latestChat.id);
        
        // Load messages from the latest chat
        const messagesRef = collection(db, "chats", latestChat.id, "messages");
        const messagesQuery = query(messagesRef);
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const loadedMessages = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            content: data.content || "",
            sender: data.sender || "bot",
            timestamp: data.timestamp?.toDate() || new Date(),
            isAnimating: false
          };
        }) as Message[];
        
        // Sort by timestamp
        loadedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoadingChat(false);
    }
  };


  // Mobile keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle mobile keyboard visibility
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const documentHeight = document.documentElement.clientHeight;
      const keyboardHeight = documentHeight - viewportHeight;
      
      setKeyboardHeight(keyboardHeight);
      setIsKeyboardOpen(keyboardHeight > 100);
    };

    const handleFocus = () => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    inputRef.current?.addEventListener('focus', handleFocus);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      inputRef.current?.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        setPaymentsData(docs);
      } catch (err) {
        console.error("Failed to load payments for chatbot context", err);
      }
    };
    fetchPayments();
  }, []);

  // Load chat history on component mount
  useEffect(() => {
    if (user && !isGuest) {
      loadChatHistory();
    } else {
      setIsLoadingChat(false);
    }
  }, [user, isGuest]);


  const coerceDate = (value: any): Date => {
    if (!value) return new Date(0);
    if (typeof value === "string") return new Date(value);
    // Firestore Timestamp
    if (value?.toDate) return value.toDate();
    try {
      return new Date(value);
    } catch {
      return new Date(0);
    }
  };


  // Optimized Firebase tool functions
  const firebaseTools = {
    queryPayments: async (filters: any = {}) => {
      try {
        let q = query(collection(db, "payments"), orderBy("created_at", "desc"));
        
        if (filters.customer_name) {
          q = query(q, where("customer_name", ">=", filters.customer_name), where("customer_name", "<=", filters.customer_name + "\uf8ff"));
        }
        if (filters.status) q = query(q, where("status", "==", filters.status));
        if (filters.amount_min) q = query(q, where("amount", ">=", filters.amount_min));
        if (filters.amount_max) q = query(q, where("amount", "<=", filters.amount_max));
        if (filters.limit) q = query(q, limit(filters.limit));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error querying payments:", error);
        if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.warn("Firestore blocked by ad blocker. Please whitelist firestore.googleapis.com");
        }
        return [];
      }
    },

    queryResidents: async (filters: any = {}) => {
      try {
        let q = query(collection(db, "residents"));
        
        if (filters.name) {
          q = query(q, where("name", ">=", filters.name), where("name", "<=", filters.name + "\uf8ff"));
        }
        if (filters.unit) q = query(q, where("unit", "==", filters.unit));
        if (filters.status) q = query(q, where("status", "==", filters.status));
        if (filters.limit) q = query(q, limit(filters.limit));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error querying residents:", error);
        return [];
      }
    },

    queryProperties: async (filters: any = {}) => {
      try {
        let q = query(collection(db, "properties"));
        
        if (filters.name) {
          q = query(q, where("name", ">=", filters.name), where("name", "<=", filters.name + "\uf8ff"));
        }
        if (filters.status) q = query(q, where("status", "==", filters.status));
        if (filters.limit) q = query(q, limit(filters.limit));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error querying properties:", error);
        return [];
      }
    },

    getDocument: async (collectionName: string, docId: string) => {
      try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      } catch (error) {
        console.error("Error getting document:", error);
        return null;
      }
    }
  };

const getAIResponse = async (question: string): Promise<string> => {
  try {
    // First check for data-specific queries
    const dataAnswer = answerFromData(question);
    if (dataAnswer) {
      return dataAnswer;
    }

    // Check if we should navigate instead of getting AI response
    if (maybeNavigate(question)) {
      return "Taking you there now...";
    }

    // Use Gemini REST API with tool calling capabilities
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for efficiency

    try {
      // Streamlined tool definitions
      const tools = [
        {
          name: "queryPayments",
          description: "Query payments",
          parameters: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              status: { type: "string" },
              amount_min: { type: "number" },
              amount_max: { type: "number" },
              limit: { type: "number" }
            }
          }
        },
        {
          name: "queryResidents", 
          description: "Query residents",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              unit: { type: "string" },
              status: { type: "string" },
              limit: { type: "number" }
            }
          }
        },
        {
          name: "queryProperties",
          description: "Query properties", 
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              status: { type: "string" },
              limit: { type: "number" }
            }
          }
        },
        {
          name: "getDocument",
          description: "Get document by ID",
          parameters: {
            type: "object",
            properties: {
              collectionName: { type: "string" },
              docId: { type: "string" }
            },
            required: ["collectionName", "docId"]
          }
        }
      ];

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `Property management assistant. ${isGuest ? 'Guest user.' : `User: ${userProfile?.fullName || 'User'}.`} Help with payments, residents, properties. Query database when needed. Respond naturally, not technically. Be concise and friendly.

Q: ${question}`
              }
            ]
          }
        ],
        tools: [
          {
            function_declarations: tools
          }
        ]
      };

      // Validate API key
      if (!GEMINI_API_KEY || GEMINI_API_KEY === "" || GEMINI_API_KEY === "your-api-key-here") {
        throw new Error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
      }

      // Use query parameter format for API key (more reliable)
      const apiUrl = `${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Gemini API responded with status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage += ` - ${errorData.error.message}`;
          } else if (errorData.error) {
            errorMessage += ` - ${JSON.stringify(errorData.error)}`;
          }
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        }
        
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      
      // Handle tool calling if Gemini requests it
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const parts = data.candidates[0].content.parts;
        const functionCalls = parts.filter((part: any) => part.functionCall);
        
        if (functionCalls.length > 0) {
          let toolResults = [];
          
          for (const functionCall of functionCalls) {
            const { name, args } = functionCall.functionCall;
            
            try {
              let result;
              switch (name) {
                case "queryPayments":
                  result = await firebaseTools.queryPayments(args);
                  break;
                case "queryResidents":
                  result = await firebaseTools.queryResidents(args);
                  break;
                case "queryProperties":
                  result = await firebaseTools.queryProperties(args);
                  break;
                case "getDocument":
                  result = await firebaseTools.getDocument(args.collectionName, args.docId);
                  break;
                default:
                  result = { error: "Unknown tool" };
              }
              
              toolResults.push({
                functionResponse: {
                  name: name,
                  response: result
                }
              });
            } catch (toolError) {
              toolResults.push({
                functionResponse: {
                  name: name,
                  response: { error: toolError.message }
                }
              });
            }
          }
          
          // Send tool results back to Gemini for final response
          const finalRequestBody = {
            contents: [
              {
                parts: [
                  {
                    text: `Based on this data, provide a natural, user-friendly response. Don't show technical details or function names. Format as a conversation:

${JSON.stringify(toolResults)}`
                  }
                ]
              }
            ]
          };
          
          const finalApiUrl = `${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
          const finalResponse = await fetch(finalApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalRequestBody),
            signal: controller.signal
          });
          
          if (finalResponse.ok) {
            const finalData = await finalResponse.json();
            let response = finalData.candidates?.[0]?.content?.parts?.[0]?.text || "I found some data but couldn't process it properly.";
            
            // Clean up technical formatting if needed
            if (response.includes('**1. Payments (`queryPayments`)**') || response.includes('function returned')) {
              response = response
                .replace(/\*\*.*?\(`.*?`\):\*\*/g, '')
                .replace(/The `.*?` function returned/g, 'I found')
                .replace(/Payment ID:/g, 'Payment:')
                .replace(/User ID:/g, 'User:')
                .replace(/Created At:/g, 'Date:')
                .replace(/`/g, '')
                .replace(/\*\*/g, '');
            }
            
            return response;
          } else {
            const errorText = await finalResponse.text();
            console.error('Final response error:', finalResponse.status, errorText);
            throw new Error(`Failed to get final response: ${finalResponse.status}`);
          }
        }
      }
      
      // Return regular response if no tool calls
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help with your property management needs!";
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('AI Error:', error);
    
    // Concise fallback responses
    if (error.name === 'AbortError') {
      return "Timeout. Try again or ask about payment data.";
    }
    
    return "AI service unavailable. I can still help with payment queries.";
  }
};

  const answerFromData = (question: string): string | null => {
    const q = question.toLowerCase();

    // Payments intents
    if (q.includes("last payment") || q.includes("recent payment")) {
      if (!paymentsData.length) return "I couldn't find any payments yet.";
      const latest = [...paymentsData].sort((a, b) => coerceDate(b.created_at).getTime() - coerceDate(a.created_at).getTime())[0];
      const dt = coerceDate(latest.created_at);
      const name = latest.customer_name || "Unknown Customer";
      const amount = Number(latest.amount) || 0;
      return `Your most recent payment is ₹${amount.toLocaleString()} from ${name} on ${dt.toLocaleDateString()} at ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    }

    if (q.includes("how many payments") || q.includes("number of payments") || q.includes("payments count")) {
      return `I found ${paymentsData.length} payment${paymentsData.length === 1 ? '' : 's'}.`;
    }

    if (q.includes("total paid") || q.includes("total amount") || q.includes("sum of payments") || q.includes("total revenue")) {
      const total = paymentsData.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      return `Your total recorded payments sum to ₹${total.toLocaleString()}.`;
    }

    if (q.includes("status")) {
      const statusMatch = q.match(/status\s+of\s+(.*)/);
      if (statusMatch) {
        const name = statusMatch[1].trim();
        const byName = paymentsData.filter(p => (p.customer_name || "").toLowerCase().includes(name));
        if (!byName.length) return `I couldn't find payments for ${name}.`;
        const statuses = byName.map(p => p.status || "unknown");
        const unique = Array.from(new Set(statuses));
        return `${name} has payment status${unique.length > 1 ? 'es' : ''}: ${unique.join(', ')}.`;
      }
    }

    return null;
  };

  const clearChat = async () => {
    if (!user || isGuest) {
      // For guests, just reset the UI
      const welcomeMessage = {
        id: "1",
        content: `Hi! I'm your Owners Hub assistant. I can answer questions about your app data (like payments) and help you navigate to sections such as Payments, Residents, or the Dashboard. Note: You're browsing as a guest with limited access.`,
        sender: "bot" as const,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      return;
    }

    // Confirmation dialog
    if (!confirm("Are you sure you want to clear all chat history? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete all chats for this user from database
      const chatsRef = collection(db, "chats");
      const userChatsQuery = query(chatsRef, where("userId", "==", user.uid));
      const chatsSnapshot = await getDocs(userChatsQuery);
      
      // Delete all messages in each chat, then delete the chat
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        
        // Delete all messages in this chat
        const messagesRef = collection(db, "chats", chatId, "messages");
        const messagesSnapshot = await getDocs(messagesRef);
        
        for (const messageDoc of messagesSnapshot.docs) {
          await deleteDoc(doc(db, "chats", chatId, "messages", messageDoc.id));
        }
        
        // Delete the chat document
        await deleteDoc(doc(db, "chats", chatId));
      }
      
      // Reset UI state
      const welcomeMessage = {
        id: "1",
        content: `Hi, ${userProfile?.fullName || 'there'}! I'm your Owners Hub assistant. I can answer questions about your app data (like payments) and help you navigate to sections such as Payments, Residents, or the Dashboard.`,
        sender: "bot" as const,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      setCurrentChatId(null);
      
      console.log("All chat data cleared from database");
    } catch (error) {
      console.error("Error clearing chat data:", error);
      alert("Error clearing chat data. Please try again.");
    }
  };

const sendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;

  // Check if this is a navigation command first
  if (maybeNavigate(inputMessage)) {
    setInputMessage("");
    return; // Navigation will happen via the maybeNavigate function
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    content: inputMessage,
    sender: "user",
    timestamp: new Date(),
    isAnimating: true,
  };

  setMessages((prev) => [...prev, userMessage]);
  setInputMessage("");
  setIsLoading(true);

  // Save user message to database
  await saveMessage(userMessage);

  // Remove animation class after animation completes
  setTimeout(() => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === userMessage.id ? { ...msg, isAnimating: false } : msg
      )
    );
  }, 300);

  try {
    const responseText = await getAIResponse(inputMessage);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: responseText,
      sender: "bot",
      timestamp: new Date(),
      isAnimating: true,
    };

    setMessages((prev) => [...prev, botMessage]);

    // Save bot message to database
    await saveMessage(botMessage);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botMessage.id ? { ...msg, isAnimating: false } : msg))
      );
    }, 300);
  } catch (error) {
    console.error("Error sending message:", error);
    let errorContent = "Sorry, I hit an unexpected error. Please try again.";
    
    if (error instanceof Error) {
      if (error.message.includes("API key is not configured")) {
        errorContent = "⚠️ Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.";
      } else if (error.message.includes("403")) {
        errorContent = "⚠️ Authentication failed. Please check your Gemini API key in the .env file. The API key may be invalid or expired.";
      } else if (error.message.includes("401")) {
        errorContent = "⚠️ Invalid API key. Please verify your VITE_GEMINI_API_KEY in the .env file.";
      } else if (error.message.includes("429")) {
        errorContent = "⚠️ Rate limit exceeded. Please try again in a moment.";
      } else if (error.message) {
        errorContent = `⚠️ ${error.message}`;
      }
    }
    
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: errorContent,
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
    inputRef.current?.focus();
  }
};
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const suggestedQuestions = isGuest ? [
    "What features does CoHub offer?",
    "How do I create an account?",
    "What are the benefits of signing up?",
    "Open Dashboard",
    "Open Residents",
    "Open Payments"
  ] : [
    "Show my latest payment",
    "How many payments are recorded?",
    "What is the total amount collected?",
    "What is the status of John Smith's payment?",
    "Show me all residents",
    "Find properties with status active",
    "Get payment details for customer John",
    "Open Payments",
    "Open Residents",
    "Open Dashboard"
  ];

const maybeNavigate = (text: string): boolean => {
  const q = text.toLowerCase();
  if (q.includes("open payments") || q.includes("go to payments") || q.includes("navigate to payments")) {
    navigate("/payments");
    return true;
  }
  if (q.includes("open residents") || q.includes("go to residents") || q.includes("navigate to residents")) {
    navigate("/residents");
    return true;
  }
  if (q.includes("open dashboard") || q.includes("go to dashboard") || q.includes("navigate to dashboard")) {
    navigate("/");
    return true;
  }
  return false;
};

  const handleSuggestionClick = (text: string) => {
    if (!maybeNavigate(text)) {
      setInputMessage(text);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 safe-area-top safe-area-bottom mobile-scroll">
      <Header />
      
      <main 
        ref={chatContainerRef}
        className={`
          flex flex-col transition-all duration-300 ease-out keyboard-adjust
          ${isKeyboardOpen 
            ? 'h-[calc(100vh-120px)] pb-2' 
            : 'h-[calc(100vh-180px)] pb-20'
          }
          max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6
        `}
        style={{
          marginBottom: isKeyboardOpen ? `${Math.max(keyboardHeight - 100, 0)}px` : '0px'
        }}
      >
        {/* Enhanced Header Section - Mobile Optimized */}
        <div className="mb-4 sm:mb-6 animate-fade-in flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                  <Badge variant="secondary" className="text-xs sm:text-sm bg-primary/10 text-primary border-primary/20 hover-scale">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    Powered by Gemini
                  </Badge>
                  <div className="hidden sm:flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {messages.length - 1} messages
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200 hover-scale text-xs sm:text-sm"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear Chat</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Messages Container - Mobile Optimized */}
        <Card className="flex-1 mb-2 sm:mb-4 overflow-hidden shadow-xl border-border/50 backdrop-blur-sm bg-background/95 animate-scale-in min-h-0">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6 scroll-smooth overscroll-contain mobile-scroll">
              {isLoadingChat && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading chat history...</span>
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 sm:gap-4 ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  } ${
                    message.isAnimating ? "animate-fade-in" : ""
                  }`}
                >
                  <Avatar className={`h-8 w-8 sm:h-11 sm:w-11 flex-shrink-0 ring-2 ring-offset-2 transition-all duration-200 hover-scale ${
                    message.sender === "user" 
                      ? "ring-primary/30 ring-offset-background shadow-lg" 
                      : "ring-muted ring-offset-background shadow-md"
                  }`}>
                    <AvatarFallback className={`${
                      message.sender === "user"
                        ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-inner"
                        : "bg-gradient-to-br from-muted via-muted/80 to-muted/60 shadow-inner"
                    } transition-all duration-200`}>
                      {message.sender === "user" ? (
                        <User className="h-3 w-3 sm:h-5 sm:w-5" />
                      ) : (
                        <Bot className="h-3 w-3 sm:h-5 sm:w-5 text-primary animate-pulse" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-[85%] sm:max-w-[85%] message-bubble ${
                    message.sender === "user" ? "text-right" : ""
                  }`}>
                    <div className={`group relative ${
                      message.sender === "user" ? "ml-auto" : ""
                    }`}>
                      <div className={`
                        relative rounded-2xl sm:rounded-3xl px-3 py-3 sm:px-5 sm:py-4 text-xs sm:text-sm shadow-md backdrop-blur-sm
                        ${message.sender === "user"
                          ? "bg-gradient-to-br from-primary via-primary to-primary/95 text-primary-foreground ml-auto shadow-primary/20"
                          : "bg-gradient-to-br from-background via-background to-muted/30 text-foreground border border-border/30 shadow-muted/20"
                        }
                        hover:shadow-lg transition-all duration-300 hover-scale group-hover:scale-105
                      `}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                        
                        {/* Enhanced Message tail */}
                        <div className={`absolute top-3 sm:top-5 w-2 h-2 sm:w-3 sm:h-3 rotate-45 transition-all duration-300 ${
                          message.sender === "user"
                            ? "-right-1 bg-gradient-to-br from-primary to-primary/95 shadow-sm"
                            : "-left-1 bg-gradient-to-br from-background to-muted/30 border-l border-t border-border/30"
                        }`} />
                      </div>
                      
                      <div className={`flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 text-xs text-muted-foreground ${
                        message.sender === "user" ? "justify-end" : ""
                      }`}>
                        <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="text-xs">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-2 sm:gap-4 animate-fade-in">
                  <Avatar className="h-8 w-8 sm:h-11 sm:w-11 ring-2 ring-muted ring-offset-2 ring-offset-background shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-muted via-muted/80 to-muted/60 shadow-inner">
                      <Bot className="h-3 w-3 sm:h-5 sm:w-5 text-primary animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gradient-to-br from-background via-background to-muted/30 rounded-2xl sm:rounded-3xl px-3 py-3 sm:px-5 sm:py-4 border border-border/30 relative shadow-md backdrop-blur-sm">
                    <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-xs sm:text-sm">AI is thinking...</span>
                    </div>
                    <div className="absolute top-3 sm:top-5 -left-1 w-2 h-2 sm:w-3 sm:h-3 rotate-45 bg-gradient-to-br from-background to-muted/30 border-l border-t border-border/30" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Suggested Questions - Mobile Optimized */}
            {messages.length === 1 && !isLoading && (
              <div className="p-3 sm:p-6 border-t border-border/50 bg-gradient-to-r from-background to-muted/10 animate-fade-in">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 font-medium">💡 Try these suggestions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {suggestedQuestions.map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto py-2 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-background to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/20 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-all duration-200 hover-scale border-dashed"
                      onClick={() => handleSuggestionClick(question)}
                    >
                      <Sparkles className="mr-1.5 sm:mr-2 h-3 w-3 text-primary/60" />
                      <span className="truncate">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Input Section - Mobile Optimized */}
        <div className={`
          flex-shrink-0 transition-all duration-300 ease-out keyboard-adjust
          ${isKeyboardOpen ? 'mb-2' : 'mb-4'}
        `}>
          <Card className="shadow-lg border-border/30 backdrop-blur-sm bg-background/95 animate-scale-in">
            <CardContent className="p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything about your property management..."
                    className="min-h-[40px] sm:min-h-[44px] max-h-24 sm:max-h-32 resize-none pr-10 sm:pr-12 text-sm border-border/50 focus:border-primary/50 transition-all duration-200 rounded-xl mobile-input mobile-focus touch-target"
                    disabled={isLoading}
                    style={{ 
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'hsl(var(--muted)) transparent'
                    }}
                  />
                  {inputMessage && !isLoading && (
                    <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {inputMessage.length}/500
                    </div>
                  )}
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 hover-scale disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {!isKeyboardOpen && <BottomNavigation />}
    </div>
  );
};

export default Chatbot;