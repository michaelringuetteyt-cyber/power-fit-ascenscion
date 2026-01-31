import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Send, Users, MessageCircle } from "lucide-react";

interface ChatSession {
  id: string;
  client_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

interface Message {
  id: string;
  session_id: string;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminChatPage = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadSessions();

    const sessionsChannel = supabase
      .channel("chat_sessions_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => loadSessions()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("chat_messages_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.session_id === selectedSession) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedSession]);

  const loadSessions = async () => {
    const { data: sessionsData } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (sessionsData) {
      const sessionsWithUnread = await Promise.all(
        sessionsData.map(async (session) => {
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id)
            .eq("sender_type", "client")
            .eq("is_read", false);
          
          return { ...session, unread_count: count || 0 };
        })
      );
      setSessions(sessionsWithUnread);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setSelectedSession(sessionId);
    
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("session_id", sessionId)
        .eq("sender_type", "client");
      loadSessions();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      session_id: selectedSession,
      sender_type: "admin",
      message: messageText,
    });
  };

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 h-[calc(100vh-80px)] lg:h-screen">
        <div className="mb-6">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">Messages</h1>
          <p className="text-muted-foreground">Gérer les conversations avec vos clients</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100%-100px)]">
          {/* Sessions List */}
          <div className="dashboard-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-display text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Conversations
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Aucune conversation
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadMessages(session.id)}
                    className={`w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                      selectedSession === session.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.client_name}</span>
                      {session.unread_count && session.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {session.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.updated_at).toLocaleDateString("fr-FR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 dashboard-card overflow-hidden flex flex-col">
            {selectedSession && currentSession ? (
              <>
                <div className="p-4 border-b border-border">
                  <h2 className="font-display text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    {currentSession.client_name}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "admin" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          msg.sender_type === "admin"
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

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Répondre au client..."
                      className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                    <Button
                      variant="hero"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChatPage;
