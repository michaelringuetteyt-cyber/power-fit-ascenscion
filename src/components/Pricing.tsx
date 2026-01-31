import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "ENTRÉE",
      subtitle: "Commencer sans pression",
      price: "29",
      period: "/mois",
      description: "Parfait pour découvrir l'univers Power Fit",
      features: [
        "4 cours collectifs / mois",
        "Accès aux horaires flexibles",
        "Application de suivi",
        "Communauté en ligne",
      ],
      popular: false,
      cta: "Commencer",
    },
    {
      name: "ASCENSION",
      subtitle: "Transformation complète",
      price: "79",
      period: "/mois",
      description: "Notre formule la plus populaire pour des résultats",
      features: [
        "Cours collectifs illimités",
        "1 session coaching / mois",
        "Plan nutritionnel personnalisé",
        "Accès prioritaire",
        "Suivi progression mensuel",
        "Groupe VIP WhatsApp",
      ],
      popular: true,
      cta: "S'engager",
    },
    {
      name: "ÉLITE",
      subtitle: "Accompagnement premium",
      price: "149",
      period: "/mois",
      description: "Pour ceux qui visent l'excellence absolue",
      features: [
        "Tout de la formule Ascension",
        "4 sessions coaching / mois",
        "Programme 100% sur-mesure",
        "Pack nutrition Herbalife inclus",
        "Accès 7j/7",
        "Ligne directe avec coach",
      ],
      popular: false,
      cta: "Rejoindre l'élite",
    },
  ];

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden perspective-container">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] -translate-y-1/2" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4 glass-3d">
            Tarifs & Formules
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider text-3d">
            CHOISISSEZ VOTRE <span className="text-gradient">NIVEAU</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Des formules adaptées à chaque étape de votre transformation
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`dashboard-card card-3d relative ${
                plan.popular 
                  ? "border-primary/50 scale-105 md:scale-110 neon-glow" 
                  : ""
              } transition-all duration-500 hover:border-primary/30`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-1.5 bg-primary rounded-full text-primary-foreground text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    Plus populaire
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="text-center pt-4 mb-6">
                <h3 className="font-display text-3xl tracking-wider mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-end justify-center gap-1">
                  <span className="font-display text-5xl text-gradient text-3d">{plan.price}€</span>
                  <span className="text-muted-foreground text-sm mb-2">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm mt-2">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                size="lg"
                onClick={scrollToBooking}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            ✓ Premier cours d'essai gratuit • ✓ Sans engagement sur la formule Entrée • ✓ Satisfait ou remboursé 14 jours
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
