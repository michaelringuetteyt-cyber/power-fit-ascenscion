import { useState } from "react";
import { MapPin, Users, Sparkles, Maximize2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import trialPassBg from "@/assets/trial-pass-bg.jpg";
import logo from "@/assets/logo.png";

interface TrialPassCardProps {
  clientName: string;
  status: string;
  remainingSessions: number;
}

const TrialPassCard = ({ clientName, status, remainingSessions }: TrialPassCardProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentYear = new Date().getFullYear();
  const isUsed = remainingSessions === 0 || status === "used";

  const PassContent = ({ isDialog = false }: { isDialog?: boolean }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-muted/50 to-background ${isDialog ? "w-full max-w-lg mx-auto" : ""}`}>
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
      <div className={`relative z-0 ${isDialog ? "p-8" : "p-6 md:p-8"}`}>
        {/* Header with address */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <MapPin className="w-4 h-4 text-primary" />
          <span>561 RUE CHAMPLAIN, JOLIETTE QC J6E 8N7</span>
        </div>
        
        {/* Title */}
        <div className="mb-6">
          <h2 className={`font-display tracking-wider ${isDialog ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"}`}>
            <span className="text-gradient">Laissez-</span>
            <br />
            <span className="text-gradient">passer</span>
          </h2>
        </div>
        
        {/* Info row */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm text-muted-foreground">1 LAISSEZ-PASSER GRATUIT</span>
          <span className={`font-display text-primary ${isDialog ? "text-3xl" : "text-2xl"}`}>{currentYear}</span>
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
            <p className={`font-display text-foreground ${isDialog ? "text-2xl" : "text-xl"}`}>
              {clientName || "Client"}
            </p>
          </div>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Power Fit Ascension" className={`object-contain ${isDialog ? "w-16 h-16" : "w-12 h-12"}`} />
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

  return (
    <>
      <div className="relative group">
        <PassContent />
        
        {/* Fullscreen button */}
        {!isUsed && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-background/80 border border-border hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
            title="Afficher en plein écran"
          >
            <Maximize2 className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none">
          <div className="relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute -top-12 right-0 z-50 p-2 rounded-full bg-background/80 border border-border hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <PassContent isDialog />
            <p className="text-center text-muted-foreground text-sm mt-4">
              Présentez ce laissez-passer à l'accueil
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialPassCard;