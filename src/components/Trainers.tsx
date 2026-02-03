import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award, Dumbbell, Heart } from "lucide-react";

interface Trainer {
  id: string;
  image: string;
  name: string;
  role: string;
  bio: string;
}

const Trainers = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  // Default trainer data
  const defaultTrainers: Trainer[] = [
    {
      id: "1",
      image: "",
      name: "Coach Principal",
      role: "Fondateur & Coach Expert",
      bio: "Plus de 10 ans d'expérience en coaching sportif et transformation physique.",
    },
  ];

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "trainers")
      .order("content_key");

    if (data && data.length > 0) {
      // Group by trainer (trainer_1_image, trainer_1_name, etc.)
      const trainerMap = new Map<string, Partial<Trainer>>();
      
      data.forEach((item) => {
        const parts = item.content_key.split("_");
        if (parts.length >= 3) {
          const trainerId = `${parts[0]}_${parts[1]}`;
          const field = parts[2];
          
          if (!trainerMap.has(trainerId)) {
            trainerMap.set(trainerId, { id: trainerId });
          }
          
          const trainer = trainerMap.get(trainerId)!;
          if (field === "image") trainer.image = item.content_value;
          if (field === "name") trainer.name = item.content_value;
          if (field === "role") trainer.role = item.content_value;
          if (field === "bio") trainer.bio = item.content_value;
        } else if (item.content_type === "image") {
          // Simple image upload
          trainerMap.set(item.id, {
            id: item.id,
            image: item.content_value,
            name: "Entraîneur",
            role: "Coach",
            bio: "",
          });
        }
      });

      const loadedTrainers = Array.from(trainerMap.values()).filter(
        (t) => t.image || t.name
      ) as Trainer[];
      
      if (loadedTrainers.length > 0) {
        setTrainers(loadedTrainers);
      } else {
        setTrainers(defaultTrainers);
      }
    } else {
      setTrainers(defaultTrainers);
    }
  };

  const stats = [
    { icon: Users, value: "500+", label: "Clients accompagnés" },
    { icon: Award, value: "10+", label: "Années d'expérience" },
    { icon: Dumbbell, value: "1000+", label: "Séances coachées" },
    { icon: Heart, value: "100%", label: "Passion & Dévouement" },
  ];

  return (
    <section id="trainers" className="py-24 relative perspective-container bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-secondary/10 rounded-full text-secondary text-sm font-medium uppercase tracking-wider mb-4 glass-3d">
            Notre Équipe
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider text-3d">
            VOS <span className="text-gradient">ENTRAÎNEURS</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Des experts passionnés dédiés à votre transformation
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm card-3d"
            >
              <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-3xl font-display text-gradient mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trainers.map((trainer, index) => (
            <div
              key={trainer.id}
              className="group relative rounded-2xl overflow-hidden bg-background border border-border/50 card-3d"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden">
                {trainer.image ? (
                  <img
                    src={trainer.image}
                    alt={trainer.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Dumbbell className="w-16 h-16 text-primary/50" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="font-display text-2xl mb-1">{trainer.name}</h3>
                <p className="text-primary text-sm font-medium mb-3">{trainer.role}</p>
                {trainer.bio && (
                  <p className="text-muted-foreground text-sm line-clamp-3">{trainer.bio}</p>
                )}
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Prêt à commencer votre transformation ?
          </p>
          <a
            href="#booking"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-medium rounded-full hover:opacity-90 transition-opacity neon-glow"
          >
            Réserver une séance
          </a>
        </div>
      </div>
    </section>
  );
};

export default Trainers;