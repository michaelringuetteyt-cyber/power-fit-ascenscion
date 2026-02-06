import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/client/ClientLayout";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string;
  date: string;
  time_slot: string;
  appointment_type: string;
  status: string;
  created_at: string;
}

const ClientBookings: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const [upcomingRes, pastRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .lt("date", today)
        .order("date", { ascending: false }),
    ]);

    if (upcomingRes.data) setUpcomingBookings(upcomingRes.data);
    if (pastRes.data) setPastBookings(pastRes.data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      confirmed: { bg: "bg-green-500/20", text: "text-green-400", label: "Confirmé" },
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "En attente" },
      cancelled: { bg: "bg-red-500/20", text: "text-red-400", label: "Annulé" },
      completed: { bg: "bg-primary/20", text: "text-primary", label: "Terminé" },
    };
    const style = styles[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const BookingCard = ({ booking, isPast }: { booking: Booking; isPast?: boolean }) => (
    <div className={`dashboard-card ${isPast ? "opacity-75" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-display text-lg">{booking.appointment_type}</h3>
            {getStatusBadge(booking.status)}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>{format(new Date(booking.date), "EEEE d MMMM yyyy", { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{booking.time_slot}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Québec, QC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg mb-4">{message}</p>
      <Button variant="hero" onClick={() => navigate("/client/bookings/new")}>
        Réserver une séance
      </Button>
    </div>
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
            Mes réservations
          </h1>
          <p className="text-muted-foreground">
            Consultez vos séances à venir et votre historique
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="upcoming">
              À venir ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Historique ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <EmptyState message="Aucune réservation à venir" />
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <EmptyState message="Aucune réservation passée" />
            ) : (
              pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} isPast />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
};

export default ClientBookings;
