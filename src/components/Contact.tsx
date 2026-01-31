import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  const contactInfo = [
    {
      icon: MapPin,
      title: "Adresse",
      content: "123 Rue de la Transformation",
      subcontent: "75001 Paris, France",
    },
    {
      icon: Phone,
      title: "Téléphone",
      content: "+33 1 23 45 67 89",
      subcontent: "Du lundi au samedi",
    },
    {
      icon: Mail,
      title: "Email",
      content: "contact@powerfit-ascension.com",
      subcontent: "Réponse sous 24h",
    },
    {
      icon: Clock,
      title: "Horaires",
      content: "Lun-Ven: 7h-21h",
      subcontent: "Sam: 9h-18h | Dim: Fermé",
    },
  ];

  return (
    <section id="contact" className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4">
            Contact
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider">
            REJOIGNEZ <span className="text-gradient">L'ASCENSION</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Prêt à transformer votre vie ? Contactez-nous dès maintenant
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {contactInfo.map((info) => (
                <div key={info.title} className="dashboard-card">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <info.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl mb-2 tracking-wide">{info.title}</h3>
                  <p className="text-foreground">{info.content}</p>
                  <p className="text-muted-foreground text-sm">{info.subcontent}</p>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="dashboard-card">
              <h3 className="font-display text-xl mb-4 tracking-wide">Suivez-nous</h3>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="flex-1">
                <Phone className="w-4 h-4 mr-2" />
                Appeler maintenant
              </Button>
              <Button variant="outline" size="lg" className="flex-1">
                <Mail className="w-4 h-4 mr-2" />
                Envoyer un email
              </Button>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="dashboard-card p-0 overflow-hidden min-h-[400px]">
            <div className="w-full h-full bg-muted/50 flex items-center justify-center relative">
              {/* Stylized Map Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }} />
              </div>
              
              {/* Map Pin */}
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                  <MapPin className="w-8 h-8 text-primary-foreground" />
                </div>
                <p className="font-display text-xl mb-2">POWER FIT | ASCENSION</p>
                <p className="text-muted-foreground text-sm">123 Rue de la Transformation</p>
                <p className="text-muted-foreground text-sm">75001 Paris</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Ouvrir dans Google Maps
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
