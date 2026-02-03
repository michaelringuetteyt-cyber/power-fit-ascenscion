import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2, Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AvailableDate {
  id: string;
  date: string;
  time_slots: string[];
  is_active: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  date: string;
  time_slot: string;
  appointment_type: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface DeductionResult {
  success: boolean;
  pass_id: string | null;
  remaining_sessions: number | null;
  pass_type: string | null;
  message: string;
}

const DEFAULT_TIME_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

const AdminBookingsPage = () => {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const [datesRes, bookingsRes] = await Promise.all([
      supabase.from("available_dates").select("*").order("date", { ascending: true }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
    ]);

    if (datesRes.data) setAvailableDates(datesRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDate = async () => {
    if (!newDate) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une date", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("available_dates").insert({
      date: newDate,
      time_slots: selectedSlots,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Erreur", description: "Cette date existe déjà", variant: "destructive" });
      } else {
        toast({ title: "Erreur", description: "Impossible d'ajouter la date", variant: "destructive" });
      }
    } else {
      toast({ title: "Succès", description: "Date ajoutée avec succès" });
      setNewDate("");
      setSelectedSlots(DEFAULT_TIME_SLOTS);
      setIsDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteDate = async (id: string) => {
    const { error } = await supabase.from("available_dates").delete().eq("id", id);
    
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la date", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Date supprimée" });
      fetchData();
    }
  };

  const toggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort());
    }
  };

  const handleConfirmBooking = async (booking: Booking) => {
    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);

    if (updateError) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de confirmer la réservation", 
        variant: "destructive" 
      });
      return;
    }

    // If user has an account, deduct a session
    if (booking.user_id) {
      const { data, error: deductError } = await supabase
        .rpc("deduct_session_from_pass", { p_user_id: booking.user_id });

      if (deductError) {
        console.error("Deduction error:", deductError);
        toast({ 
          title: "Réservation confirmée", 
          description: "Attention: impossible de déduire la séance du pass" 
        });
      } else if (data && data.length > 0) {
        const result = data[0] as DeductionResult;
        if (result.success) {
          toast({ 
            title: "Réservation confirmée", 
            description: `${result.message}. Séances restantes: ${result.remaining_sessions! > 900 ? "illimité" : result.remaining_sessions}` 
          });
        } else {
          toast({ 
            title: "Réservation confirmée", 
            description: `⚠️ ${result.message}` 
          });
        }
      }
    } else {
      toast({ 
        title: "Réservation confirmée", 
        description: "Client sans compte - aucune déduction de pass" 
      });
    }

    fetchData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getAppointmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      trial: "Cours d'essai",
      consultation: "Consultation",
      coaching: "Session coaching",
    };
    return types[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display tracking-wider">Gestion des Réservations</h1>
            <p className="text-muted-foreground">Gérez les dates disponibles et les réservations</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une date
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une date disponible</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Créneaux horaires</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedSlots.includes(slot)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button onClick={handleAddDate} className="w-full" variant="hero">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Available Dates */}
            <div className="dashboard-card p-6">
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Dates disponibles ({availableDates.length})
              </h2>
              
              {availableDates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune date disponible.<br />
                  Ajoutez des dates pour permettre les réservations.
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {availableDates.map((date) => (
                    <div
                      key={date.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">{formatDate(date.date)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {date.time_slots.length} créneaux
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDate(date.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookings */}
            <div className="dashboard-card p-6">
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Réservations ({bookings.length})
              </h2>
              
              {bookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune réservation pour le moment.
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{booking.client_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.client_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmBooking(booking)}
                              className="gap-1 text-green-600 border-green-600 hover:bg-green-600/10"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Confirmer
                            </Button>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            booking.status === "confirmed" 
                              ? "bg-green-500/20 text-green-500" 
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}>
                            {booking.status === "confirmed" ? "Confirmé" : "En attente"}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>📅 {formatDate(booking.date)} à {booking.time_slot}</p>
                        <p>📞 {booking.client_phone}</p>
                        <p>🎯 {getAppointmentTypeLabel(booking.appointment_type)}</p>
                        {booking.user_id ? (
                          <p className="flex items-center gap-1 text-primary mt-1">
                            <CheckCircle className="w-3 h-3" />
                            Client avec compte
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-muted-foreground mt-1">
                            <AlertCircle className="w-3 h-3" />
                            Client sans compte
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBookingsPage;
