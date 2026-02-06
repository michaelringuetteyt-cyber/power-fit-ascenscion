import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/client/ClientLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, Ticket, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AvailableDate {
  id: string;
  date: string;
  time_slots: string[];
  is_active: boolean;
  max_bookings: number;
}

interface SlotBookingCount {
  date: string;
  time_slot: string;
  count: number;
}

interface ActivePass {
  id: string;
  pass_type: string;
  remaining_sessions: number;
  total_sessions: number;
}

const ClientNewBooking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [slotBookingCounts, setSlotBookingCounts] = useState<SlotBookingCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const [activePasses, setActivePasses] = useState<ActivePass[]>([]);
  const [selectedPass, setSelectedPass] = useState<ActivePass | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; phone: string | null } | null>(null);

  useEffect(() => {
    loadUserData();
    fetchAvailableDates();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?redirect=/client/bookings/new");
      return;
    }

    setUserId(user.id);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      setUserProfile(profile);
    }

    // Load active passes
    const { data: passes } = await supabase
      .from("passes")
      .select("id, pass_type, remaining_sessions, total_sessions")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("remaining_sessions", 0);

    if (passes && passes.length > 0) {
      setActivePasses(passes);
      if (passes.length === 1) {
        setSelectedPass(passes[0]);
      }
    }
  };

  const fetchAvailableDates = async () => {
    setLoading(true);

    const [datesRes, bookingsRes] = await Promise.all([
      supabase
        .from("available_dates")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true }),
      supabase
        .from("bookings")
        .select("date, time_slot")
        .gte("date", new Date().toISOString().split("T")[0]),
    ]);

    if (datesRes.data) {
      setAvailableDates(datesRes.data);
    }

    if (bookingsRes.data) {
      const counts: SlotBookingCount[] = [];
      bookingsRes.data.forEach(booking => {
        const existing = counts.find(c => c.date === booking.date && c.time_slot === booking.time_slot);
        if (existing) {
          existing.count++;
        } else {
          counts.push({ date: booking.date, time_slot: booking.time_slot, count: 1 });
        }
      });
      setSlotBookingCounts(counts);
    }

    setLoading(false);
  };

  const monthName = currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, () => null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateAvailable = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return availableDates.some(d => d.date === dateStr && d.is_active);
  };

  const getTimeSlotsForDate = (dateStr: string) => {
    const dateInfo = availableDates.find(d => d.date === dateStr);
    return dateInfo?.time_slots || [];
  };

  const isSlotFull = (dateStr: string, timeSlot: string) => {
    const dateInfo = availableDates.find(d => d.date === dateStr);
    if (!dateInfo) return false;

    const bookingCount = slotBookingCounts.find(
      c => c.date === dateStr && c.time_slot === timeSlot
    )?.count || 0;

    return bookingCount >= dateInfo.max_bookings;
  };

  const getRemainingSpots = (dateStr: string, timeSlot: string) => {
    const dateInfo = availableDates.find(d => d.date === dateStr);
    if (!dateInfo) return 0;

    const bookingCount = slotBookingCounts.find(
      c => c.date === dateStr && c.time_slot === timeSlot
    )?.count || 0;

    return Math.max(0, dateInfo.max_bookings - bookingCount);
  };

  const getPassTypeLabel = (type: string) => {
    switch (type) {
      case "trial": return "Cours d'essai";
      case "5_sessions": return "Carte 5 séances";
      case "10_sessions": return "Carte 10 séances";
      case "monthly": return "Mensuel";
      default: return type;
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !userId || !userProfile || !selectedPass) return;

    setSubmitting(true);

    const bookingData = {
      date: selectedDate,
      time_slot: selectedTime,
      appointment_type: selectedPass.pass_type === "trial" ? "Cours d'essai" : "Séance",
      client_name: userProfile.full_name,
      client_email: userProfile.email,
      client_phone: userProfile.phone || "",
      status: "confirmed",
      user_id: userId,
    };

    // Insert booking
    const { data: bookingResult, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select("id")
      .single();

    if (bookingError) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réservation.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Deduct session from pass
    const { data: deductResult, error: deductError } = await supabase.rpc(
      "deduct_session_from_pass",
      { p_user_id: userId, p_booking_id: bookingResult.id }
    );

    if (deductError || !deductResult?.[0]?.success) {
      // Rollback booking
      await supabase.from("bookings").delete().eq("id", bookingResult.id);
      toast({
        title: "Erreur",
        description: deductResult?.[0]?.message || "Impossible de déduire une séance de votre pass.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setStep(3);
    toast({
      title: "Réservation confirmée !",
      description: `Il vous reste ${deductResult[0].remaining_sessions} séance(s) sur votre pass.`,
    });
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate);
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  // No passes available
  if (activePasses.length === 0) {
    return (
      <ClientLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-secondary" />
            </div>
            <h1 className="font-display text-3xl mb-4">Aucun laissez-passer actif</h1>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas de laissez-passer avec des séances disponibles.
              Achetez un pass pour pouvoir réserver vos séances.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" onClick={() => navigate("/#pricing")}>
                Voir les offres
              </Button>
              <Button variant="outline" onClick={() => navigate("/client/bookings")}>
                Retour aux réservations
              </Button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/client/bookings")}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Retour aux réservations
          </Button>
          <h1 className="font-display text-3xl lg:text-4xl mb-2">
            Nouvelle réservation
          </h1>
          <p className="text-muted-foreground">
            Choisissez votre créneau et confirmez votre séance
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-lg transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select pass and date */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Pass selection */}
              {activePasses.length > 1 && (
                <div className="dashboard-card">
                  <h3 className="font-display text-xl mb-4">Sélectionner un laissez-passer</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {activePasses.map((pass) => (
                      <button
                        key={pass.id}
                        onClick={() => setSelectedPass(pass)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedPass?.id === pass.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Ticket className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{getPassTypeLabel(pass.pass_type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {pass.remaining_sessions}/{pass.total_sessions} séances restantes
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single pass display */}
              {activePasses.length === 1 && selectedPass && (
                <div className="dashboard-card">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getPassTypeLabel(selectedPass.pass_type)}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPass.remaining_sessions}/{selectedPass.total_sessions} séances restantes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar */}
              <div className="dashboard-card">
                <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Choisir une date
                </h3>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-display text-lg capitalize">{monthName}</span>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                    <div key={day} className="text-center text-xs text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" />
                  ))}
                  {days.map((day) => {
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isAvailable = isDateAvailable(day);
                    const isPast = new Date(dateStr) < today;
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={day}
                        onClick={() => isAvailable && !isPast && setSelectedDate(dateStr)}
                        disabled={!isAvailable || isPast}
                        className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : isAvailable && !isPast
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "text-muted-foreground/50 cursor-not-allowed"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className="dashboard-card">
                  <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Choisir une heure
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {getTimeSlotsForDate(selectedDate).map((slot) => {
                      const isFull = isSlotFull(selectedDate, slot);
                      const remaining = getRemainingSpots(selectedDate, slot);

                      return (
                        <button
                          key={slot}
                          onClick={() => !isFull && setSelectedTime(slot)}
                          disabled={isFull}
                          className={`p-3 rounded-lg text-center transition-all ${
                            selectedTime === slot
                              ? "bg-primary text-primary-foreground"
                              : isFull
                              ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                              : "bg-muted hover:bg-primary/10"
                          }`}
                        >
                          <span className="font-medium">{slot}</span>
                          {!isFull && (
                            <span className="block text-xs opacity-75">
                              {remaining} place(s)
                            </span>
                          )}
                          {isFull && (
                            <span className="block text-xs">Complet</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="hero"
                  size="lg"
                  disabled={!selectedDate || !selectedTime || !selectedPass}
                  onClick={() => setStep(2)}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="dashboard-card">
                <h3 className="font-display text-xl mb-6">Confirmer votre réservation</h3>

                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium capitalize">{formatSelectedDate()}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Heure</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-muted-foreground">Laissez-passer</span>
                    <span className="font-medium">{selectedPass && getPassTypeLabel(selectedPass.pass_type)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Séances après réservation</span>
                    <span className="font-medium text-primary">
                      {selectedPass && selectedPass.remaining_sessions - 1} séance(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Réservation en cours..." : "Confirmer la réservation"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="font-display text-3xl mb-4">Réservation confirmée !</h2>
              <p className="text-muted-foreground mb-2">
                Votre séance est réservée pour le
              </p>
              <p className="text-xl font-medium capitalize mb-6">
                {formatSelectedDate()} à {selectedTime}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" onClick={() => navigate("/client/bookings")}>
                  Voir mes réservations
                </Button>
                <Button variant="outline" onClick={() => navigate("/client")}>
                  Retour au tableau de bord
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientNewBooking;
