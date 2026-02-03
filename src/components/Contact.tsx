import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  const contactInfo = [
    {
      icon: MapPin,
      title: "Adresse",
      content: "561 rue Champlain",
      subcontent: "Joliette, QC J6E 8N7, Canada",
    },
    {
      icon: Phone,
      title: "Téléphone",
      content: "(579) 766-1221",
      subcontent: "Lun-Dim",
    },
    {
      icon: Mail,
      title: "Email Général",
      content: "contact.powerfit.ascension@powerfitascension.com",
      subcontent: "Réponse sous 24h",
    },
    {
      icon: Mail,
      title: "Email Coaching",
      content: "Coachyilver-leloupquebecois@hotmail.com",
      subcontent: "Questions sur le coaching",
    },
    {
      icon: Clock,
      title: "Horaires",
      content: "Lun-Mer: 9h-17h | Jeu-Ven: 9h-21h",
      subcontent: "Sam-Dim: 9h-14h",
    },
  ];

  return (
    <section id="contact" className="py-24 relative perspective-container">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4 glass-3d">
            Contact
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider text-3d">
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
              {contactInfo.map((info, index) => (
                <div 
                  key={info.title} 
                  className="dashboard-card card-3d"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:neon-glow transition-all">
                    <info.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl mb-2 tracking-wide">{info.title}</h3>
                  <p className="text-foreground break-all text-sm sm:text-base">{info.content}</p>
                  <p className="text-muted-foreground text-sm">{info.subcontent}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="flex-1 card-3d" asChild>
                <a href="tel:+15797661221">
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler maintenant
                </a>
              </Button>
              <Button variant="outline" size="lg" className="flex-1 card-3d" asChild>
                <a href="mailto:contact.powerfit.ascension@powerfitascension.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer un email
                </a>
              </Button>
            </div>
          </div>

          {/* Map Placeholder with 3D */}
          <div className="dashboard-card card-3d p-0 overflow-hidden min-h-[400px]">
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
              <div className="relative z-10 text-center float-3d">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 neon-glow">
                  <MapPin className="w-8 h-8 text-primary-foreground" />
                </div>
                <p className="font-display text-xl mb-2">POWER FIT | ASCENSION</p>
                <p className="text-muted-foreground text-sm">561 rue Champlain</p>
                <p className="text-muted-foreground text-sm">Joliette, QC J6E 8N7</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <a href="https://www.google.com/maps/search/?api=1&query=561+rue+Champlain+Joliette+QC+Canada" target="_blank" rel="noopener noreferrer">
                    Ouvrir dans Google Maps
                  </a>
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
