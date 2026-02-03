import { useState, useEffect, forwardRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  Ticket,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientLayoutProps {
  children: React.ReactNode;
}

interface Profile {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Pass {
  remaining_sessions: number;
  status: string;
}

const ClientLayout = forwardRef<HTMLDivElement, ClientLayoutProps>(({ children }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadProfile();
    loadPasses();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const loadPasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("passes")
      .select("remaining_sessions, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (data) {
      const total = data.reduce((sum: number, pass: Pass) => sum + pass.remaining_sessions, 0);
      setRemainingSessions(total);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { href: "/client", icon: LayoutDashboard, label: "Tableau de bord" },
    { href: "/client/profile", icon: User, label: "Mon profil" },
    { href: "/client/bookings", icon: CalendarDays, label: "Mes réservations" },
    { href: "/client/passes", icon: Ticket, label: "Mes laissez-passer" },
    { href: "/client/purchases", icon: Receipt, label: "Mes achats" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div ref={ref} className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 bg-sidebar-background border-r border-sidebar-border z-50 transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="w-4 h-4" />
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
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {profile?.full_name || "Client"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Sessions counter */}
          <div className="p-4 mx-4 mt-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Séances restantes</p>
            <p className="text-3xl font-display text-gradient">{remainingSessions}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-display text-lg">MON ESPACE</span>
          <div className="w-10" />
        </header>

        {/* Close button for mobile sidebar */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="fixed top-4 right-4 z-50 lg:hidden p-2 bg-card rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {children}
      </main>
    </div>
  );
});

ClientLayout.displayName = "ClientLayout";

export default ClientLayout;
