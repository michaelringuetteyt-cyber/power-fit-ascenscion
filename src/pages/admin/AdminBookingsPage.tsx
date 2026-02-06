import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2, Clock, Users, CheckCircle, AlertCircle, Edit2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RecurringDatesDialog from "@/components/admin/RecurringDatesDialog";
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
  max_bookings: number;
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
  const [maxBookings, setMaxBookings] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<AvailableDate | null>(null);
  const [editMaxBookings, setEditMaxBookings] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      max_bookings: maxBookings,
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
      setMaxBookings(1);
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

  const handleEditMaxBookings = (date: AvailableDate) => {
    setEditingDate(date);
    setEditMaxBookings(date.max_bookings);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMaxBookings = async () => {
    if (!editingDate) return;

    const { error } = await supabase
      .from("available_dates")
      .update({ max_bookings: editMaxBookings })
      .eq("id", editingDate.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le nombre de places", variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Nombre de places mis à jour" });
      setIsEditDialogOpen(false);
      setEditingDate(null);
      fetchData();
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
        .rpc("deduct_session_from_pass", { p_user_id: booking.user_id, p_booking_id: booking.id });

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

  const handleCancelBooking = async (booking: Booking) => {
    // If it was confirmed and user has account, refund the session first
    if (booking.status === "confirmed" && booking.user_id) {
      const { data, error: refundError } = await supabase
        .rpc("refund_session_to_pass", { p_booking_id: booking.id });

      if (refundError) {
        console.error("Refund error:", refundError);
        toast({ 
          title: "Erreur", 
          description: "Impossible de rembourser la séance", 
          variant: "destructive" 
        });
        return;
      }

      if (data && data.length > 0) {
        const result = data[0] as DeductionResult;
        if (result.success) {
          toast({ 
            title: "Séance remboursée", 
            description: `${result.message}. Séances restantes: ${result.remaining_sessions! > 900 ? "illimité" : result.remaining_sessions}` 
          });
        }
      }
    }

    // Delete the booking
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id);

    if (deleteError) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer la réservation", 
        variant: "destructive" 
      });
      return;
    }

    toast({ 
      title: "Réservation annulée", 
      description: booking.status === "confirmed" && booking.user_id 
        ? "La séance a été remboursée au client" 
        : "Réservation supprimée"
    });

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

  // Calculate bookings count per date
  const getBookingsCountForDate = (date: string) => {
    return bookings.filter(b => b.date === date).length;
  };

  // Calculate max capacity for a date (max_bookings * number of time slots)
  const getMaxCapacityForDate = (date: AvailableDate) => {
    return date.max_bookings * date.time_slots.length;
  };

  // Check if date is fully booked
  const isDateFull = (date: AvailableDate) => {
    const currentBookings = getBookingsCountForDate(date.date);
    const maxCapacity = getMaxCapacityForDate(date);
    return currentBookings >= maxCapacity;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display tracking-wider">Gestion des Réservations</h1>
            <p className="text-muted-foreground">Gérez les dates disponibles et les réservations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <RecurringDatesDialog 
              onDatesAdded={fetchData} 
              defaultTimeSlots={DEFAULT_TIME_SLOTS} 
            />
            
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Réservations max par créneau</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxBookings}
                    onChange={(e) => setMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Le créneau sera fermé automatiquement une fois cette limite atteinte
                  </p>
                </div>
                
                <Button onClick={handleAddDate} className="w-full" variant="hero">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>

          {/* Edit Max Bookings Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Modifier le nombre de places</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {editingDate && (
                  <p className="text-sm text-muted-foreground">
                    {formatDate(editingDate.date)}
                  </p>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">Réservations max par créneau</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editMaxBookings}
                    onChange={(e) => setEditMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <Button onClick={handleUpdateMaxBookings} className="w-full" variant="hero">
                  Enregistrer
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
                  {availableDates.map((date) => {
                    const currentBookings = getBookingsCountForDate(date.date);
                    const maxCapacity = getMaxCapacityForDate(date);
                    const isFull = isDateFull(date);
                    const fillPercentage = Math.min((currentBookings / maxCapacity) * 100, 100);
                    
                    return (
                      <div
                        key={date.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isFull 
                            ? "bg-destructive/10 border-destructive/30" 
                            : "bg-muted/50 border-transparent"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{formatDate(date.date)}</p>
                            {isFull && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                                COMPLET
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className={`text-sm font-medium ${isFull ? "text-destructive" : "text-foreground"}`}>
                                {currentBookings} / {maxCapacity}
                              </span>
                              <span className="text-xs text-muted-foreground">réservations</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {date.time_slots.length} créneaux × {date.max_bookings} max
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                isFull 
                                  ? "bg-destructive" 
                                  : fillPercentage > 75 
                                    ? "bg-yellow-500" 
                                    : "bg-primary"
                              }`}
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMaxBookings(date)}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDate(date.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBooking(booking)}
                            className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-3 h-3" />
                            Annuler
                          </Button>
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
