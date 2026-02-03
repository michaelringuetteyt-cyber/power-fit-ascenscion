import { useState, useRef } from "react";
import { MapPin, Users, Sparkles, Maximize2, X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import trialPassBg from "@/assets/trial-pass-bg.jpg";
import logo from "@/assets/logo.png";

interface TrialPassCardProps {
  clientName: string;
  status: string;
  remainingSessions: number;
}

const TrialPassCard = ({ clientName, status, remainingSessions }: TrialPassCardProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const passRef = useRef<HTMLDivElement>(null);
  const dialogPassRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const isUsed = remainingSessions === 0 || status === "used";

  const handleDownload = async () => {
    const targetRef = isFullscreen ? dialogPassRef : passRef;
    if (!targetRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement("a");
      link.download = `laissez-passer-powerfit-${clientName || "client"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Laissez-passer téléchargé !");
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
  };

  const PassContent = ({ isDialog = false, innerRef }: { isDialog?: boolean; innerRef?: React.RefObject<HTMLDivElement> }) => (
    <div 
      ref={innerRef}
      className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-muted/50 to-background ${isDialog ? "w-full max-w-lg mx-auto" : ""}`}
    >
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
        <PassContent innerRef={passRef} />
        
        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
          {!isUsed && (
            <>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-lg bg-background/80 border border-border hover:bg-muted transition-colors disabled:opacity-50"
                title="Télécharger en image"
              >
                <Download className={`w-5 h-5 text-primary ${isDownloading ? "animate-pulse" : ""}`} />
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-lg bg-background/80 border border-border hover:bg-muted transition-colors"
                title="Afficher en plein écran"
              >
                <Maximize2 className="w-5 h-5 text-primary" />
              </button>
            </>
          )}
        </div>
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
            <PassContent isDialog innerRef={dialogPassRef} />
            <div className="flex flex-col items-center gap-3 mt-4">
              <p className="text-muted-foreground text-sm">
                Présentez ce laissez-passer à l'accueil
              </p>
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                variant="outline"
                className="gap-2"
              >
                <Download className={`w-4 h-4 ${isDownloading ? "animate-pulse" : ""}`} />
                {isDownloading ? "Téléchargement..." : "Télécharger l'image"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialPassCard;