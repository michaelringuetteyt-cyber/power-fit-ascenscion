import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/client/ClientLayout";
import TrialPassCard from "@/components/client/TrialPassCard";
import { Ticket, Calendar, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Pass {
  id: string;
  pass_type: string;
  total_sessions: number;
  remaining_sessions: number;
  purchase_date: string;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

function ClientPasses() {
  const navigate = useNavigate();
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [inactivePasses, setInactivePasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    loadPasses();
  }, []);

  const loadPasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Load profile for client name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (profile) {
      setClientName(profile.full_name || "");
    }

    const [activeRes, inactiveRes] = await Promise.all([
      supabase
        .from("passes")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("passes")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["expired", "used"])
        .order("created_at", { ascending: false }),
    ]);

    if (activeRes.data) setActivePasses(activeRes.data);
    if (inactiveRes.data) setInactivePasses(inactiveRes.data);
    setLoading(false);
  };

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case "trial":
        return "Cours d'essai";
      case "5_sessions":
        return "5 Séances";
      case "10_sessions":
        return "10 Séances";
      case "monthly":
        return "Abonnement Mensuel";
      default:
        return type;
    }
  };

  const getPassTypeIcon = (type: string) => {
    switch (type) {
      case "monthly":
        return <Calendar className="w-6 h-6 text-secondary" />;
      case "trial":
        return <Ticket className="w-6 h-6 text-green-500" />;
      default:
        return <Ticket className="w-6 h-6 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: "bg-green-500/20", text: "text-green-400", label: "Actif" },
      expired: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Expiré" },
      used: { bg: "bg-muted", text: "text-muted-foreground", label: "Utilisé" },
    };
    const style = styles[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const PassCard = ({ pass, isActive }: { pass: Pass; isActive?: boolean }) => {
    const progressPercent = (pass.remaining_sessions / pass.total_sessions) * 100;
    
    return (
      <div className={`dashboard-card ${!isActive ? "opacity-75" : ""}`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {getPassTypeIcon(pass.pass_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-display text-lg">{getPassTypeLabel(pass.pass_type)}</h3>
              {getStatusBadge(pass.status)}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Séances restantes</span>
                <span className="font-medium text-primary">
                  {pass.remaining_sessions} / {pass.total_sessions}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Acheté le {format(new Date(pass.purchase_date), "d MMM yyyy", { locale: fr })}</span>
              </div>
              {pass.expiry_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Expire le {format(new Date(pass.expiry_date), "d MMM yyyy", { locale: fr })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Ticket className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg">{message}</p>
    </div>
  );

  const totalRemaining = activePasses.reduce((sum, pass) => sum + pass.remaining_sessions, 0);

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">
            Mes laissez-passer
          </h1>
          <p className="text-muted-foreground">
            Gérez vos passes et suivez vos séances restantes
          </p>
        </div>

        {/* Summary card */}
        <div className="dashboard-card mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total séances restantes</p>
              <p className="text-4xl font-display text-gradient">{totalRemaining}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="active">
              Actifs ({activePasses.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Historique ({inactivePasses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {activePasses.length === 0 ? (
              <EmptyState message="Aucun laissez-passer actif" />
            ) : (
              <>
                {/* Trial passes get special display */}
                {activePasses.filter(p => p.pass_type === "trial").map((pass) => (
                  <TrialPassCard 
                    key={pass.id}
                    clientName={clientName}
                    status={pass.status}
                    remainingSessions={pass.remaining_sessions}
                  />
                ))}
                {/* Other passes */}
                {activePasses.filter(p => p.pass_type !== "trial").map((pass) => (
                  <PassCard key={pass.id} pass={pass} isActive />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {inactivePasses.length === 0 ? (
              <EmptyState message="Aucun laissez-passer dans l'historique" />
            ) : (
              <>
                {/* Used trial passes */}
                {inactivePasses.filter(p => p.pass_type === "trial").map((pass) => (
                  <TrialPassCard 
                    key={pass.id}
                    clientName={clientName}
                    status={pass.status}
                    remainingSessions={pass.remaining_sessions}
                  />
                ))}
                {/* Other passes */}
                {inactivePasses.filter(p => p.pass_type !== "trial").map((pass) => (
                  <PassCard key={pass.id} pass={pass} />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}

export default ClientPasses;
