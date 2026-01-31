import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, LogOut, Users, MessageCircle, ArrowLeft } from "lucide-react";
import { User } from "@supabase/supabase-js";

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

const AdminChat = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (adminData) {
        setIsAdmin(true);
        loadSessions();
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to new sessions and messages
  useEffect(() => {
    if (!isAdmin) return;

    const sessionsChannel = supabase
      .channel("admin_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => loadSessions()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("admin_messages")
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
  }, [isAdmin, selectedSession]);

  const loadSessions = async () => {
    const { data: sessionsData } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (sessionsData) {
      // Get unread counts
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
      // Mark as read
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

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erreur de connexion: " + error.message);
      return;
    }

    if (data.user) {
      // Check if admin
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (!adminData) {
        // First admin - register them
        const { count } = await supabase
          .from("admin_users")
          .select("*", { count: "exact", head: true });

        if (count === 0) {
          await supabase.from("admin_users").insert({
            user_id: data.user.id,
            name: email.split("@")[0],
          });
          setIsAdmin(true);
          loadSessions();
        } else {
          alert("Vous n'êtes pas administrateur");
          await supabase.auth.signOut();
        }
      } else {
        setIsAdmin(true);
        loadSessions();
      }
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin-chat`,
      },
    });

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert("Vérifiez votre email pour confirmer votre inscription");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl">Chargement...</div>
      </div>
    );
  }

  // Login form
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="dashboard-card max-w-md w-full">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au site
          </button>

          <h1 className="font-display text-3xl mb-2 text-center">Administration</h1>
          <p className="text-muted-foreground text-center mb-8">
            Connectez-vous pour accéder au chat admin
          </p>

          <div className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="admin@powerfit.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mot de passe</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" variant="hero" className="w-full">
                Se connecter
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Premier admin ? Créez votre compte
              </p>
              <div>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Email"
                />
              </div>
              <div>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Mot de passe (min 6 caractères)"
                />
              </div>
              <Button type="submit" variant="outline" className="w-full">
                Créer un compte admin
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-display text-2xl">
              POWER FIT <span className="text-primary">|</span> Admin Chat
            </h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Sessions List */}
          <div className="dashboard-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-display text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Conversations
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Aucune conversation pour le moment
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
                      {session.unread_count && session.unread_count > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {session.unread_count}
                        </span>
                      ) : null}
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
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <h2 className="font-display text-xl flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    {currentSession.client_name}
                  </h2>
                </div>

                {/* Messages */}
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

                {/* Input */}
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
                      <Send className="w-5 h-5 mr-2" />
                      Envoyer
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
    </div>
  );
};

export default AdminChat;
