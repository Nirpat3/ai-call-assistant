import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  Send,
  Sparkles,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  BarChart3,
  Volume2,
  VolumeX,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppStoreLayout from "@/components/AppStoreLayout";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  commandType?: string;
  success?: boolean;
  structuredData?: any;
}

interface Conversation {
  id: number;
  title: string | null;
  lastInteractionAt: Date;
}

interface CommandResult {
  conversationId: number;
  message: Message;
  success: boolean;
  data?: any;
  structuredData?: any;
}

// Message Composer Component - Shared input form
function MessageComposer({
  input,
  setInput,
  handleSubmit,
  handleVoiceInput,
  isListening,
  voiceEnabled,
  setVoiceEnabled,
  isPending,
  inputRef,
}: {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleVoiceInput: () => void;
  isListening: boolean;
  voiceEnabled: boolean;
  setVoiceEnabled: (value: boolean) => void;
  isPending: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleVoiceInput}
          disabled={isListening}
          className={cn("flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10", isListening && "bg-destructive text-destructive-foreground")}
          data-testid="button-voice-input"
        >
          <Mic className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isListening && "animate-pulse")} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={cn("flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10", voiceEnabled && "bg-primary text-primary-foreground")}
          data-testid="button-voice-output"
        >
          {voiceEnabled ? (
            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </Button>
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 text-sm sm:text-base h-9 sm:h-10"
          disabled={isPending}
          data-testid="input-command"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isPending}
          className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          size="icon"
          data-testid="button-submit"
        >
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </form>
  );
}

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/ai/conversations"],
  });

  const { data: conversationData } = useQuery<{ conversation: Conversation; messages: Message[] }>({
    queryKey: ["/api/ai/conversations", currentConversationId],
    enabled: !!currentConversationId,
  });

  useEffect(() => {
    if (conversationData) {
      setMessages(conversationData.messages || []);
    }
  }, [conversationData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.lang.startsWith("en") && voice.name.includes("Female")
    ) || voices.find((voice) => voice.lang.startsWith("en"));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const processCommandMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("/api/ai/command", {
        method: "POST",
        body: JSON.stringify({
          message,
          conversationId: currentConversationId,
        }),
      }) as Promise<CommandResult>;
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      setMessages((prev) => [...prev, data.message]);
      speakText(data.message.content);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations", data.conversationId] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processCommandMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");

    const tempUserMessage: Message = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    processCommandMutation.mutate(userMessage);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in your browser. Please try Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const loadConversation = (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
  };

  const renderStructuredData = (structuredData: any) => {
    if (!structuredData) return null;

    if (structuredData.multiTask && structuredData.tasks) {
      return (
        <div className="space-y-3 mt-3">
          {structuredData.tasks.map((task: any, idx: number) => (
            <Card key={idx} className="p-4 bg-gradient-to-br from-primary/5 to-primary/10" data-testid={`multitask-card-${idx}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{task.taskNumber}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-medium text-sm text-foreground" data-testid={`task-description-${idx}`}>
                    {task.taskDescription}
                  </div>
                  {task.type === "stats" && (
                    <div className="grid grid-cols-2 gap-2">
                      {task.stats?.map((stat: any, statIdx: number) => (
                        <div key={statIdx} className="bg-background/50 rounded p-2" data-testid={`task-${idx}-stat-${statIdx}`}>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                          <div className="text-lg font-bold">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.type === "list" && (
                    <div className="space-y-1">
                      {task.items?.slice(0, 3).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="text-sm bg-background/50 rounded p-2" data-testid={`task-${idx}-item-${itemIdx}`}>
                          {item.title || item.subtitle}
                        </div>
                      ))}
                      {task.items?.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{task.items.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    switch (structuredData.type) {
      case "list":
        return (
          <div className="space-y-2 mt-3">
            {structuredData.items?.map((item: any, idx: number) => (
              <Card key={idx} className="p-3 bg-muted/50" data-testid={`structured-list-item-${idx}`}>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1 space-y-1">
                    {item.title && (
                      <div className="font-medium text-sm" data-testid={`item-title-${idx}`}>{item.title}</div>
                    )}
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground" data-testid={`item-subtitle-${idx}`}>{item.subtitle}</div>
                    )}
                    {item.details && (
                      <div className="text-xs text-muted-foreground" data-testid={`item-details-${idx}`}>{item.details}</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case "stats":
        return (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {structuredData.stats?.map((stat: any, idx: number) => (
              <Card key={idx} className="p-4 bg-gradient-to-br from-primary/10 to-primary/5" data-testid={`stat-card-${idx}`}>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground" data-testid={`stat-label-${idx}`}>
                    {stat.label}
                  </span>
                </div>
                <div className="text-2xl font-bold" data-testid={`stat-value-${idx}`}>{stat.value}</div>
              </Card>
            ))}
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-2 mt-3">
            {structuredData.events?.length === 0 ? (
              <Card className="p-4 bg-muted/50" data-testid="no-events">
                <p className="text-sm text-muted-foreground">
                  {structuredData.message || "No events found"}
                </p>
              </Card>
            ) : (
              structuredData.events?.map((event: any, idx: number) => (
                <Card key={idx} className="p-3 bg-muted/50" data-testid={`event-${idx}`}>
                  <div className="font-medium text-sm" data-testid={`event-title-${idx}`}>{event.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </div>
                </Card>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppStoreLayout title="AI Assistant" subtitle="Natural language control">
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-background">
      {/* Conversation History Sidebar - Hidden on mobile, visible on desktop */}
      <div
        className={cn(
          "hidden lg:flex lg:w-64 xl:w-72 border-r bg-card flex-shrink-0 transition-all flex-col",
          conversations.length === 0 && "lg:hidden"
        )}
      >
        <div className="p-3 lg:p-4 border-b flex-shrink-0">
          <Button
            onClick={startNewConversation}
            className="w-full"
            variant="default"
            data-testid="button-new-conversation"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={cn(
                  "w-full text-left p-3 rounded-lg hover:bg-accent transition-colors",
                  currentConversationId === conv.id && "bg-accent"
                )}
                data-testid={`conversation-${conv.id}`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" data-testid={`conversation-title-${conv.id}`}>
                      {conv.title || "New Conversation"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conv.lastInteractionAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="max-w-2xl w-full text-center space-y-6 md:space-y-8">
              {/* Title and Description */}
              <div className="space-y-3 md:space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto px-4">
                  Control your entire system with natural language. Manage calls, contacts, calendar, emails, and more.
                </p>
              </div>

              {/* Input Field */}
              <div className="px-4">
                <MessageComposer
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  handleVoiceInput={handleVoiceInput}
                  isListening={isListening}
                  voiceEnabled={voiceEnabled}
                  setVoiceEnabled={setVoiceEnabled}
                  isPending={processCommandMutation.isPending}
                  inputRef={inputRef}
                />
              </div>

              {/* Clickable Example Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left px-4">
                {[
                  { icon: MessageSquare, text: "Show me my recent calls" },
                  { icon: Clock, text: "What's on my calendar today?" },
                  { icon: BarChart3, text: "Get my contact analytics" },
                  { icon: CheckCircle2, text: "Create a reminder for tomorrow" },
                ].map((example, idx) => (
                  <Card
                    key={idx}
                    className="p-3 sm:p-4 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setInput(example.text)}
                    data-testid={`example-${idx}`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <example.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">{example.text}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-2 sm:gap-3 md:gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${idx}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[80%] space-y-2",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 sm:px-4 sm:py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                      data-testid={`message-content-${idx}`}
                    >
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    {message.success !== undefined && (
                      <div className="flex items-center gap-1 text-xs px-2">
                        {message.success ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground" data-testid={`message-status-${idx}`}>Success</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-destructive" />
                            <span className="text-muted-foreground" data-testid={`message-status-${idx}`}>Failed</span>
                          </>
                        )}
                      </div>
                    )}
                    {message.structuredData && renderStructuredData(message.structuredData)}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input Form - Only show at bottom when there are messages */}
        {messages.length > 0 && (
          <div className="border-t bg-card p-3 sm:p-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <MessageComposer
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                handleVoiceInput={handleVoiceInput}
                isListening={isListening}
                voiceEnabled={voiceEnabled}
                setVoiceEnabled={setVoiceEnabled}
                isPending={processCommandMutation.isPending}
                inputRef={inputRef}
              />
            </div>
          </div>
        )}
      </div>
    </div>
    </AppStoreLayout>
  );
}
