import { Target, Users, Zap } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "OBJECTIF",
      description: "Reprendre le contrôle de votre corps et de votre discipline à travers une transformation complète.",
    },
    {
      icon: Users,
      title: "COMMUNAUTÉ",
      description: "Un environnement bienveillant, sans intimidation, où chaque membre s'élève ensemble.",
    },
    {
      icon: Zap,
      title: "ÉNERGIE",
      description: "Retrouvez votre vitalité et confiance grâce à une approche globale corps-esprit.",
    },
  ];

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider">
            L'APPROCHE <span className="text-gradient">POWER FIT</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Plus qu'un simple club de fitness — un véritable levier d'ascension personnelle 
            qui combine entraînement, coaching humain et nutrition pour une transformation durable.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div
              key={value.title}
              className="dashboard-card group hover:border-primary/50 transition-all duration-500"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="font-display text-2xl mb-3 tracking-wide">{value.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { number: "500+", label: "Membres transformés" },
            { number: "15+", label: "Cours par semaine" },
            { number: "98%", label: "Satisfaction client" },
            { number: "3", label: "Piliers d'excellence" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-4xl md:text-5xl text-gradient mb-2">{stat.number}</div>
              <div className="text-muted-foreground text-sm uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
