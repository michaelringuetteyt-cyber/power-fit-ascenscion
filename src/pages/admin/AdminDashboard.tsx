import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { MessageCircle, Image, Users, TrendingUp } from "lucide-react";

interface Stats {
  totalMessages: number;
  unreadMessages: number;
  activeSessions: number;
  totalImages: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0,
    unreadMessages: 0,
    activeSessions: 0,
    totalImages: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentSessions();
  }, []);

  const loadStats = async () => {
    const [messagesResult, unreadResult, sessionsResult, contentResult] = await Promise.all([
      supabase.from("chat_messages").select("*", { count: "exact", head: true }),
      supabase.from("chat_messages").select("*", { count: "exact", head: true })
        .eq("sender_type", "client").eq("is_read", false),
      supabase.from("chat_sessions").select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("site_content").select("*", { count: "exact", head: true })
        .eq("content_type", "image"),
    ]);

    setStats({
      totalMessages: messagesResult.count || 0,
      unreadMessages: unreadResult.count || 0,
      activeSessions: sessionsResult.count || 0,
      totalImages: contentResult.count || 0,
    });
  };

  const loadRecentSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (data) {
      setRecentSessions(data);
    }
  };

  const statCards = [
    { 
      icon: MessageCircle, 
      label: "Messages non lus", 
      value: stats.unreadMessages,
      color: "primary",
      onClick: () => navigate("/admin/chat")
    },
    { 
      icon: Users, 
      label: "Sessions actives", 
      value: stats.activeSessions,
      color: "secondary" 
    },
    { 
      icon: TrendingUp, 
      label: "Total messages", 
      value: stats.totalMessages,
      color: "accent" 
    },
    { 
      icon: Image, 
      label: "Images du site", 
      value: stats.totalImages,
      color: "primary",
      onClick: () => navigate("/admin/content")
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre panneau d'administration Power Fit
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              disabled={!stat.onClick}
              className="dashboard-card card-3d text-left group"
            >
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center mb-4 group-hover:neon-glow transition-all`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <p className="text-3xl font-display text-gradient mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Recent Sessions */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl">Conversations récentes</h2>
            <button
              onClick={() => navigate("/admin/chat")}
              className="text-sm text-primary hover:underline"
            >
              Voir tout →
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune conversation pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate("/admin/chat")}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {session.client_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{session.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.updated_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${session.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
