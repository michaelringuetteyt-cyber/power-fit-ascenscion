import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for existing session in localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem("chat_session_id");
    const savedClientName = localStorage.getItem("chat_client_name");
    
    if (savedSessionId && savedClientName) {
      setSessionId(savedSessionId);
      setClientName(savedClientName);
      setIsStarted(true);
      loadMessages(savedSessionId);
    }
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadMessages = async (sid: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const startChat = async () => {
    if (!clientName.trim()) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ client_name: clientName.trim() })
      .select()
      .single();

    if (!error && data) {
      setSessionId(data.id);
      localStorage.setItem("chat_session_id", data.id);
      localStorage.setItem("chat_client_name", clientName.trim());
      setIsStarted(true);

      // Send welcome message from admin
      await supabase.from("chat_messages").insert({
        session_id: data.id,
        sender_type: "admin",
        message: `Bonjour ${clientName.trim()} ! 👋 Bienvenue chez POWER FIT | ASCENSION. Comment puis-je vous aider aujourd'hui ?`,
      });

      loadMessages(data.id);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender_type: "client",
      message: messageText,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isStarted) {
        sendMessage();
      } else {
        startChat();
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300 neon-glow"
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[380px] transition-all duration-300 ${
        isMinimized ? "h-14" : "h-[500px]"
      }`}
    >
      <div className="glass-3d rounded-2xl overflow-hidden h-full flex flex-col border border-primary/30">
        {/* Header */}
        <div className="bg-primary/20 p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg tracking-wide">POWER FIT</h3>
              <p className="text-xs text-muted-foreground">
                {isStarted ? "En ligne • Réponse rapide" : "Démarrer une conversation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages or Start Form */}
            {!isStarted ? (
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <MessageCircle className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-display text-2xl mb-2">Besoin d'aide ?</h3>
                  <p className="text-muted-foreground text-sm">
                    Notre équipe est là pour répondre à vos questions
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Votre prénom</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ex: Jean"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={startChat}
                    disabled={!clientName.trim() || isLoading}
                  >
                    {isLoading ? "Connexion..." : "Démarrer le chat"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "client" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.sender_type === "client"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Écrivez votre message..."
                      className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                    <Button
                      variant="hero"
                      size="icon"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="h-12 w-12"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
