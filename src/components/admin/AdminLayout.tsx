import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut, 
  MessageCircle, 
  Image, 
  LayoutDashboard, 
  Menu, 
  X,
  ArrowLeft,
  CalendarDays,
  Users,
  User as UserIcon,
  Ticket,
  Receipt,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Profile {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Pass {
  remaining_sessions: number;
  status: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [clientSectionOpen, setClientSectionOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: adminData } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (adminData) {
        setIsAdmin(true);
        loadUnreadCount();
        loadProfile(session.user.id);
        loadPasses(session.user.id);
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

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const loadPasses = async (userId: string) => {
    const { data } = await supabase
      .from("passes")
      .select("remaining_sessions, status")
      .eq("user_id", userId)
      .eq("status", "active");

    if (data) {
      const total = data.reduce((sum: number, pass: Pass) => sum + pass.remaining_sessions, 0);
      setRemainingSessions(total);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin_unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const loadUnreadCount = async () => {
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_type", "client")
      .eq("is_read", false);
    
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    navigate("/");
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
      if (import.meta.env.DEV) console.error("Auth error:", error);
      toast({
        title: "Erreur de connexion",
        description: "Identifiants incorrects. Veuillez réessayer.",
        variant: "destructive",
      });
      return;
    }

    if (data.user) {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!adminData) {
        // Use atomic function to prevent race condition on first admin creation
        const { data: isFirstAdmin, error: rpcError } = await supabase
          .rpc('create_first_admin', {
            new_user_id: data.user.id,
            admin_name: email.split("@")[0],
          });

        if (rpcError) {
          if (import.meta.env.DEV) console.error("RPC error:", rpcError);
        }

        if (isFirstAdmin === true) {
          setIsAdmin(true);
          loadUnreadCount();
        } else {
          toast({
            title: "Accès refusé",
            description: "Vous n'êtes pas autorisé à accéder à cette zone.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      } else {
        setIsAdmin(true);
        loadUnreadCount();
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
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      if (import.meta.env.DEV) console.error("Signup error:", error);
      toast({
        title: "Erreur d'inscription",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre inscription.",
      });
    }
  };

  const adminNavItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/stats", icon: BarChart3, label: "Statistiques" },
    { path: "/admin/chat", icon: MessageCircle, label: "Messages", badge: unreadCount },
    { path: "/admin/bookings", icon: CalendarDays, label: "Réservations" },
    { path: "/admin/content", icon: Image, label: "Contenu" },
    { path: "/admin/users", icon: Users, label: "Utilisateurs" },
  ];

  const clientNavItems = [
    { path: "/client/profile", icon: UserIcon, label: "Mon profil" },
    { path: "/client/bookings", icon: CalendarDays, label: "Mes réservations" },
    { path: "/client/passes", icon: Ticket, label: "Mes laissez-passer" },
    { path: "/client/purchases", icon: Receipt, label: "Mes achats" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl">Chargement...</div>
      </div>
    );
  }

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
            Connectez-vous pour accéder au panneau admin
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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <h1 className="font-display text-xl">
          POWER FIT <span className="text-primary">|</span> Admin
        </h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-card border-r border-border h-screen overflow-y-auto
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Header with profile */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour au site</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-medium text-lg">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {profile?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Sessions counter */}
          <div className="p-4 mx-4 mt-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Séances restantes</p>
            <p className="text-3xl font-display text-gradient">{remainingSessions}</p>
          </div>

          {/* Admin Navigation */}
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-4">Administration</p>
            <nav className="space-y-1">
              {adminNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${location.pathname === item.path 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Client Navigation */}
          <div className="p-4 pt-0">
            <Collapsible open={clientSectionOpen} onOpenChange={setClientSectionOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-4 hover:text-foreground transition-colors">
                <span>Mon espace client</span>
                {clientSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <nav className="space-y-1">
                  {clientNavItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${location.pathname === item.path 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-border mt-auto">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
