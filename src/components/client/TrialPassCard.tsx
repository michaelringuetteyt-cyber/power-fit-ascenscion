import { MapPin, Users, Sparkles } from "lucide-react";
import trialPassBg from "@/assets/trial-pass-bg.jpg";
import logo from "@/assets/logo.png";

interface TrialPassCardProps {
  clientName: string;
  status: string;
  remainingSessions: number;
}

const TrialPassCard = ({ clientName, status, remainingSessions }: TrialPassCardProps) => {
  const currentYear = new Date().getFullYear();
  const isUsed = remainingSessions === 0 || status === "used";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-muted/50 to-background">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${trialPassBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      
      {/* Used overlay */}
      {isUsed && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-muted/90 px-6 py-3 rounded-full border border-border">
            <span className="text-muted-foreground font-display text-lg">UTILISÉ</span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-0 p-6 md:p-8">
        {/* Header with address */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <MapPin className="w-4 h-4 text-primary" />
          <span>561 RUE CHAMPLAIN, JOLIETTE QC J6E 8N7</span>
        </div>
        
        {/* Title */}
        <div className="mb-6">
          <h2 className="font-display text-4xl md:text-5xl tracking-wider">
            <span className="text-gradient">Laissez-</span>
            <br />
            <span className="text-gradient">passer</span>
          </h2>
        </div>
        
        {/* Info row */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm text-muted-foreground">1 LAISSEZ-PASSER GRATUIT</span>
          <span className="text-2xl font-display text-primary">{currentYear}</span>
        </div>
        
        {/* Consultation info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-secondary mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Consultation gratuite incluse</p>
              <p className="text-xs text-muted-foreground">
                Analyse de la composition corporelle sur rendez-vous
              </p>
            </div>
          </div>
        </div>
        
        {/* Client name section */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">INVITÉ</p>
            <p className="font-display text-xl text-foreground">
              {clientName || "Client"}
            </p>
          </div>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Power Fit Ascension" className="w-12 h-12 object-contain" />
            <div className="text-right">
              <p className="font-display text-xs leading-tight">POWER FIT</p>
              <p className="font-display text-xs text-primary leading-tight">ASCENSION</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Vous pouvez être accompagné de 2 personnes</span>
        </div>
      </div>
    </div>
  );
};

export default TrialPassCard;
