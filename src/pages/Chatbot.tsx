import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Mobile keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

    // Use Gemini AI for general conversation - with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch('https://qtglsxsscxqpividdfsj.supabase.co/functions/v1/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Context: You are a helpful property management assistant for CoHub. 
            ${isGuest ? 'The user is browsing as a guest with limited access.' : `The user's name is ${userProfile?.fullName || 'User'}.`}
            You help with property management, maintenance requests, payments, and resident services.
            Keep responses helpful, concise, and friendly.
            
            User question: ${question}`
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI service responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "I'm here to help with your property management needs!";
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('AI Error:', error);
    
    // Provide helpful fallback responses based on error type
    if (error.name === 'AbortError') {
      return "I'm taking a bit too long to respond. Please try again in a moment, or ask me about your payment data which I can access directly.";
    }
    
    return "I'm having trouble connecting to my AI service right now, but I can still help with questions about your payment data! Try asking about recent payments, total amounts, or payment statuses.";
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

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        content: `Hi${isGuest ? '' : `, ${userProfile?.fullName || 'there'}`}! I'm your Owners Hub assistant. I can answer questions about your app data (like payments) and help you navigate to sections such as Payments, Residents, or the Dashboard.${isGuest ? ' Note: You\'re browsing as a guest with limited access.' : ''}`,
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
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

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botMessage.id ? { ...msg, isAnimating: false } : msg))
      );
    }, 300);
  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "Sorry, I hit an unexpected error. Please try again.",
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
        <Card className="flex-1 mb-2 sm:mb-4 overflow-hidden shadow-xl border-border/50 backdrop-blur-sm bg-background/95 animate-scale-in min-h-[400px] sm:min-h-[330px]">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-6 scroll-smooth overscroll-contain mobile-scroll">
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
            {/* {messages.length === 1 && !isLoading && (
              <div className="p-3 sm:p-6 border-t border-border/50 bg-gradient-to-r from-background to-muted/10 animate-fade-in max-h-60 overflow-y-auto">
  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 font-medium">
    💡 Try these suggestions:
  </p>
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

            )} */}
          </CardContent>
        </Card>

       {/* Enhanced Input Section - with Try Suggestions Toggle */}
<div
  className={`flex-shrink-0 transition-all duration-300 ease-out keyboard-adjust`}
>
  <Card className="shadow-lg border-border/30 backdrop-blur-sm bg-background/95 animate-scale-in relative">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-end gap-2 sm:gap-3 relative">
        <div className="flex-1 relative">
          <Textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything about your property management..."
            className="min-h-[40px] sm:min-h-[44px] max-h-24 sm:max-h-32 resize-none pr-24 sm:pr-28 text-sm border-border/50 focus:border-primary/50 transition-all duration-200 rounded-xl mobile-input mobile-focus touch-target"
            disabled={isLoading}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--muted)) transparent",
            }}
          />

          {inputMessage && !isLoading && (
            <div className="absolute right-20 sm:right-24 bottom-2 sm:bottom-3 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {inputMessage.length}/500
            </div>
          )}
        </div>

        {/* Try Suggestions Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-dashed bg-gradient-to-r from-background to-muted/10 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 transition-all duration-200"
          onClick={() => setShowSuggestions((prev) => !prev)}
        >
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary/70" />
        </Button>

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

      {/* Collapsible Suggestions - Above Input */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 w-full mb-2 sm:mb-3 rounded-xl p-3 sm:p-4 bg-white border border-border/50 shadow-lg animate-slide-up overflow-y-auto max-h-60 z-50">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 font-medium">
            💡 Try these suggestions:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {suggestedQuestions.map((question) => (
              <Button
                key={question}
                variant="outline"
                size="sm"
                className="text-left justify-start h-auto py-2 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-background to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/20 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-all duration-200 hover-scale border-dashed"
                onClick={() => {
                  handleSuggestionClick(question);
                  setShowSuggestions(false);
                }}
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
</div>


      </main>

      {!isKeyboardOpen && <BottomNavigation />}
    </div>
  );
};

export default Chatbot;