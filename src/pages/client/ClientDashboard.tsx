import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/client/ClientLayout";
import TrialPassCard from "@/components/client/TrialPassCard";
import { CalendarDays, Ticket, Receipt, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string;
  date: string;
  time_slot: string;
  appointment_type: string;
  status: string;
}

interface Pass {
  id: string;
  pass_type: string;
  remaining_sessions: number;
  total_sessions: number;
  status: string;
}

interface Purchase {
  id: string;
  item_name: string;
  amount: number;
  purchase_date: string;
  payment_status: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const [bookingsRes, passesRes, purchasesRes, profileRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(3),
      supabase
        .from("passes")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false })
        .limit(3),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (bookingsRes.data) setUpcomingBookings(bookingsRes.data);
    if (passesRes.data) setActivePasses(passesRes.data);
    if (purchasesRes.data) setRecentPurchases(purchasesRes.data);
    if (profileRes.data) setClientName(profileRes.data.full_name || "");
    
    setLoading(false);
  };

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case "5_sessions":
        return "5 Séances";
      case "10_sessions":
        return "10 Séances";
      case "monthly":
        return "Mensuel";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: "bg-green-500/20 text-green-400",
      pending: "bg-yellow-500/20 text-yellow-400",
      cancelled: "bg-red-500/20 text-red-400",
      completed: "bg-green-500/20 text-green-400",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  const totalRemainingSessions = activePasses.reduce(
    (sum, pass) => sum + pass.remaining_sessions,
    0
  );

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
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue dans votre espace client Power Fit
          </p>
        </div>

        {/* Active Trial Pass - Show prominently */}
        {activePasses.filter(p => p.pass_type === "trial" && p.remaining_sessions > 0).length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Mon laissez-passer actif
            </h2>
            {activePasses
              .filter(p => p.pass_type === "trial" && p.remaining_sessions > 0)
              .map((pass) => (
                <TrialPassCard
                  key={pass.id}
                  clientName={clientName}
                  status={pass.status}
                  remainingSessions={pass.remaining_sessions}
                />
              ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="dashboard-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-display text-gradient">
                  {totalRemainingSessions}
                </p>
                <p className="text-sm text-muted-foreground">Séances restantes</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-3xl font-display">{upcomingBookings.length}</p>
                <p className="text-sm text-muted-foreground">Réservations à venir</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-display">{activePasses.length}</p>
                <p className="text-sm text-muted-foreground">Passes actifs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming bookings */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl">Prochaines réservations</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/client/bookings")}
                className="gap-1"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune réservation à venir</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/client/bookings/new")}
                >
                  Réserver une séance
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{booking.appointment_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.date), "EEEE d MMMM", { locale: fr })} à{" "}
                        {booking.time_slot}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                        booking.status
                      )}`}
                    >
                      {booking.status === "confirmed" ? "Confirmé" : 
                       booking.status === "pending" ? "En attente" : booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active passes */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl">Mes laissez-passer</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/client/passes")}
                className="gap-1"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {activePasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun laissez-passer actif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePasses.slice(0, 3).map((pass) => (
                  <div
                    key={pass.id}
                    className="p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{getPassTypeLabel(pass.pass_type)}</p>
                      <span className="text-primary font-medium">
                        {pass.remaining_sessions}/{pass.total_sessions}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                        style={{
                          width: `${(pass.remaining_sessions / pass.total_sessions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent purchases */}
          <div className="dashboard-card lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl">Achats récents</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/client/purchases")}
                className="gap-1"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {recentPurchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun achat pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground text-sm border-b border-border">
                      <th className="pb-3 font-medium">Article</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Montant</th>
                      <th className="pb-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b border-border/50">
                        <td className="py-3">{purchase.item_name}</td>
                        <td className="py-3 text-muted-foreground">
                          {format(new Date(purchase.purchase_date), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </td>
                        <td className="py-3">{purchase.amount.toFixed(2)} $</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                              purchase.payment_status
                            )}`}
                          >
                            {purchase.payment_status === "completed" ? "Payé" :
                             purchase.payment_status === "pending" ? "En attente" : 
                             purchase.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
