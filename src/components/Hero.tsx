import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import heroCommunity from "@/assets/hero-community.png";

const Hero = () => {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden perspective-container">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroCommunity}
          alt="POWER FIT Community"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20" />
      </div>

      {/* 3D Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* 3D Logo */}
        <div className="mb-8 animate-slide-up tilt-3d">
          <div className="inline-flex items-center justify-center">
            <div className="relative glass-3d p-4 rounded-2xl">
              <div className="w-24 h-24 md:w-32 md:h-32 border-4 border-foreground/80 rounded-b-3xl flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="flex items-end gap-1">
                  <div className="w-2 h-8 md:w-3 md:h-12 bg-foreground rounded-t-sm" />
                  <div className="w-2 h-12 md:w-3 md:h-16 bg-foreground rounded-t-sm" />
                  <div className="w-2 h-10 md:w-3 md:h-14 bg-primary rounded-t-sm" />
                  <div className="w-2 h-12 md:w-3 md:h-16 bg-foreground rounded-t-sm" />
                  <div className="w-2 h-8 md:w-3 md:h-12 bg-foreground rounded-t-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title with 3D effect */}
        <h1 
          className="font-display text-5xl md:text-7xl lg:text-8xl mb-4 tracking-wider animate-slide-up text-3d"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="text-foreground">POWER FIT</span>
          <span className="text-gradient"> | </span>
          <span className="text-gradient">ASCENSION</span>
        </h1>

        {/* Tagline */}
        <p 
          className="text-xl md:text-2xl text-muted-foreground mb-4 font-light animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          Élever les individus physiquement et mentalement
        </p>
        <p 
          className="text-lg text-foreground/70 mb-12 animate-slide-up"
          style={{ animationDelay: "0.5s" }}
        >
          Un corps. Une énergie. Un mouvement.
        </p>

        {/* CTA Buttons with 3D hover */}
        <div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up"
          style={{ animationDelay: "0.6s" }}
        >
          <Button variant="hero" size="xl" onClick={scrollToBooking} className="card-3d">
            Réserver mon cours gratuit
          </Button>
          <Button variant="heroOutline" size="xl" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} className="card-3d">
            Découvrir nos services
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <ChevronDown className="w-8 h-8 text-muted-foreground" />
      </div>
    </section>
  );
};

export default Hero;
