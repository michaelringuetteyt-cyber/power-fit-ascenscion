import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Facebook } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        isScrolled
          ? "bg-background/90 backdrop-blur-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-foreground/80 rounded-b-xl flex items-center justify-center">
              <div className="flex items-end gap-0.5">
                <div className="w-1 h-3 bg-foreground rounded-t-sm" />
                <div className="w-1 h-4 bg-foreground rounded-t-sm" />
                <div className="w-1 h-3.5 bg-primary rounded-t-sm" />
                <div className="w-1 h-4 bg-foreground rounded-t-sm" />
                <div className="w-1 h-3 bg-foreground rounded-t-sm" />
              </div>
            </div>
            <span className="font-display text-xl tracking-wider hidden sm:block">
              POWER FIT <span className="text-primary">|</span> ASCENSION
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

          {/* CTA Button */}
          <div className="hidden lg:block">
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
          <div className="lg:hidden py-6 border-t border-border">
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
