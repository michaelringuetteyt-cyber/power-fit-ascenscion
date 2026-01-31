import { Dumbbell, Heart, Apple, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Services = () => {
  const services = [
    {
      icon: Dumbbell,
      title: "ENTRAÎNEMENTS DE GROUPE",
      subtitle: "Cardio • Boxe • Abs & Glutes",
      description: "Des sessions dynamiques et variées pour tous les niveaux. Cardio intense, boxe pour se défouler, et circuits ciblés pour sculpter votre silhouette.",
      features: ["Sessions de 45-60 min", "Tous niveaux acceptés", "Équipement fourni", "Ambiance motivante"],
      color: "primary",
    },
    {
      icon: Heart,
      title: "COACHING PERSONNALISÉ",
      subtitle: "Évaluation • Plan Stratégique",
      description: "Un accompagnement sur-mesure avec évaluation complète de votre condition physique et un plan d'action adapté à vos objectifs.",
      features: ["Bilan initial complet", "Programme personnalisé", "Suivi régulier", "Ajustements continus"],
      color: "secondary",
    },
    {
      icon: Apple,
      title: "ACCOMPAGNEMENT NUTRITIONNEL",
      subtitle: "Solution Herbalife",
      description: "Une approche nutritionnelle simple et efficace avec les produits Herbalife pour optimiser vos résultats et votre énergie au quotidien.",
      features: ["Conseils personnalisés", "Produits de qualité", "Plans repas simples", "Résultats durables"],
      color: "primary",
    },
  ];

  return (
    <section id="services" className="py-24 relative">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4">
            Hub de Services
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider">
            NOS <span className="text-gradient">3 PILIERS</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Une approche complète pour votre transformation
          </p>
        </div>

        {/* Services Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="dashboard-card group relative overflow-hidden hover:border-primary/50 transition-all duration-500"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  service.color === "primary" ? "bg-primary/20" : "bg-secondary/20"
                }`}>
                  <service.icon className={`w-7 h-7 ${
                    service.color === "primary" ? "text-primary" : "text-secondary"
                  }`} />
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  0{index + 1}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-display text-2xl mb-1 tracking-wide">{service.title}</h3>
              <p className={`text-sm mb-4 ${
                service.color === "primary" ? "text-primary" : "text-secondary"
              }`}>{service.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {service.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      service.color === "primary" ? "bg-primary" : "bg-secondary"
                    }`} />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button variant="dashboard" className="w-full group/btn">
                En savoir plus
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>

              {/* Decorative Corner */}
              <div className={`absolute top-0 right-0 w-20 h-20 opacity-10 ${
                service.color === "primary" ? "bg-primary" : "bg-secondary"
              }`} style={{
                clipPath: "polygon(100% 0, 0 0, 100% 100%)"
              }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
