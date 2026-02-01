import { Instagram, Facebook, Mail, Phone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: "#about", label: "Approche" },
    { href: "#services", label: "Services" },
    { href: "#pricing", label: "Tarifs" },
    { href: "#booking", label: "Réservation" },
  ];

  const legalLinks = [
    { href: "#", label: "Mentions légales" },
    { href: "#", label: "Politique de confidentialité" },
    { href: "#", label: "CGV" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 border-2 border-foreground/80 rounded-b-xl flex items-center justify-center">
                <div className="flex items-end gap-0.5">
                  <div className="w-1.5 h-4 bg-foreground rounded-t-sm" />
                  <div className="w-1.5 h-5 bg-foreground rounded-t-sm" />
                  <div className="w-1.5 h-4.5 bg-primary rounded-t-sm" />
                  <div className="w-1.5 h-5 bg-foreground rounded-t-sm" />
                  <div className="w-1.5 h-4 bg-foreground rounded-t-sm" />
                </div>
              </div>
              <span className="font-display text-2xl tracking-wider">
                POWER FIT <span className="text-primary">|</span> ASCENSION
              </span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Plus qu'un club de fitness — un espace de transformation physique et mentale 
              où chaque individu s'élève vers sa meilleure version.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact.powerfit.ascension@powerfitascension.com"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="tel:+15797661221"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-xl mb-6 tracking-wide">Navigation</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display text-xl mb-6 tracking-wide">Légal</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} POWER FIT | ASCENSION. Tous droits réservés.
          </p>
          <p className="text-muted-foreground text-sm">
            Un corps. Une énergie. Un mouvement.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
