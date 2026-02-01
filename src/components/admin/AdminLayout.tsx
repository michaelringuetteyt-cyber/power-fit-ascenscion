import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  CalendarDays
} from "lucide-react";
import { User } from "@supabase/supabase-js";

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

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/chat", icon: MessageCircle, label: "Messages", badge: unreadCount },
    { path: "/admin/bookings", icon: CalendarDays, label: "Réservations" },
    { path: "/admin/content", icon: Image, label: "Contenu" },
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
          w-64 bg-card border-r border-border
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="p-6 border-b border-border hidden lg:block">
            <h1 className="font-display text-2xl">
              POWER FIT <span className="text-primary">|</span> Admin
            </h1>
          </div>

          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
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

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border hidden lg:block">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Administrateur</p>
              </div>
            </div>
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
