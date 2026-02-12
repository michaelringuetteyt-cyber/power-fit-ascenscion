import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X, Facebook, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const Header = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const navLinks = [
    { href: "#about", label: "Approche" },
    { href: "#services", label: "Services" },
    { href: "#gallery", label: "Galerie" },
    { href: "#contact", label: "Contact" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? "bg-background/95 backdrop-blur-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <img src={logo} alt="Power Fit Ascension" className="h-12 w-auto" />
            <span className="font-display text-lg tracking-wider hidden sm:block">
              POWER FIT <span className="text-primary">ASCENSION</span>
            </span>
          </a>

          {/* Facebook Link */}
          <a
            href="https://www.facebook.com/profile.php?id=61586281512766"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 text-primary" />
          </a>
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Auth & CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Mon espace
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/client")}>
                    Tableau de bord
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/client/profile")}>
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/client/bookings")}>
                    Mes réservations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/client/passes")}>
                    Mes laissez-passer
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        Administration
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                Connexion
              </Button>
            )}
            <Button
              variant="hero"
              size="default"
              onClick={() => scrollToSection("#booking")}
            >
              Réserver
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-6 border-t border-border bg-background/95 backdrop-blur-lg">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {link.label}
                </button>
              ))}
              
              {user ? (
                <>
                  <button
                    onClick={() => {
                      navigate("/client");
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-lg font-medium text-primary hover:text-primary/80 transition-colors text-left"
                  >
                    Mon espace
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate("/admin");
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      Administration
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-lg font-medium text-destructive hover:text-destructive/80 transition-colors text-left"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate("/auth");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Connexion
                </Button>
              )}
              
              <Button
                variant="hero"
                size="lg"
                className="mt-4"
                onClick={() => scrollToSection("#booking")}
              >
                Réserver mon cours gratuit
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
