import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Mail, Phone, ChevronLeft, ChevronRight, Check, AlertCircle, MapPin, LogIn, Ticket, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
}

interface TrialEligibility {
  checked: boolean;
  eligible: boolean;
  passId?: string;
  checking: boolean;
}

interface ActivePass {
  id: string;
  pass_type: string;
  remaining_sessions: number;
  total_sessions: number;
}

const Booking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [slotBookingCounts, setSlotBookingCounts] = useState<SlotBookingCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [trialEligibility, setTrialEligibility] = useState<TrialEligibility>({
    checked: false,
    eligible: false,
    checking: false,
  });
  const [activePasses, setActivePasses] = useState<ActivePass[]>([]);
  const [selectedPass, setSelectedPass] = useState<ActivePass | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "trial",
  });

  // Check auth status and load profile + passes
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setIsLoggedIn(true);
        
        // Load profile to pre-fill form
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile) {
          setFormData(prev => ({
            ...prev,
            name: profile.full_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
          }));
        }

        // Load active passes
        const { data: passes } = await supabase
          .from("passes")
          .select("id, pass_type, remaining_sessions, total_sessions")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("remaining_sessions", 0);
        
        if (passes) {
          setActivePasses(passes);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          setIsLoggedIn(true);
          
          // Load profile on login
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (profile) {
            setFormData(prev => ({
              ...prev,
              name: profile.full_name || "",
              email: profile.email || "",
              phone: profile.phone || "",
            }));
          }

          // Load active passes
          const { data: passes } = await supabase
            .from("passes")
            .select("id, pass_type, remaining_sessions, total_sessions")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .gt("remaining_sessions", 0);
          
          if (passes) {
            setActivePasses(passes);
          }
        } else {
          setUserId(null);
          setIsLoggedIn(false);
          setActivePasses([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch available dates and booking counts
  useEffect(() => {
    const fetchAvailableDates = async () => {
      setLoading(true);
      
      // Fetch available dates
      const { data: datesData, error: datesError } = await supabase
        .from("available_dates")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (datesError) {
        console.error("Error fetching dates:", datesError);
      } else {
        setAvailableDates(datesData || []);
      }

      // Fetch booking counts per slot
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("date, time_slot")
        .gte("date", new Date().toISOString().split("T")[0]);

      if (bookingsError) {
        console.error("Error fetching booking counts:", bookingsError);
      } else if (bookingsData) {
        // Count bookings per date/slot
        const counts: SlotBookingCount[] = [];
        bookingsData.forEach(booking => {
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

    fetchAvailableDates();
  }, []);

  // Generate calendar days for current month
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

  const appointmentTypes = [
    { id: "trial", label: "Cours d'essai gratuit", icon: "🎯", showCalendar: true },
    { id: "session", label: "Séance avec laissez-passer", icon: "🎫", showCalendar: true, requiresPass: true },
    { id: "consultation", label: "Consultation bien-être", icon: "💪", showCalendar: false },
    { id: "coaching", label: "Session coaching", icon: "🏆", showCalendar: false },
  ];

  const TYPEFORM_URL = "https://form.typeform.com/to/bfrqdD5j";

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const checkTrialEligibility = async (uid: string) => {
    setTrialEligibility(prev => ({ ...prev, checking: true }));
    
    const { data, error } = await supabase.rpc('create_trial_pass_if_eligible', {
      p_user_id: uid
    });

    if (error) {
      console.error("Error checking trial eligibility:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier votre éligibilité au cours d'essai.",
        variant: "destructive",
      });
      setTrialEligibility({ checked: true, eligible: false, checking: false });
      return;
    }

    const result = data?.[0];
    if (result?.success) {
      setTrialEligibility({
        checked: true,
        eligible: true,
        passId: result.pass_id,
        checking: false,
      });
      toast({
        title: "Pass d'essai attribué !",
        description: "Votre cours d'essai gratuit a été activé. Choisissez maintenant votre créneau.",
      });
      setStep(2);
    } else {
      setTrialEligibility({
        checked: true,
        eligible: false,
        checking: false,
      });
    }
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

  const handleTypeSelect = (type: typeof appointmentTypes[0]) => {
    setFormData({ ...formData, type: type.id });
    setSelectedPass(null);
    
    if (type.id === "trial") {
      // Trial requires authentication
      if (!isLoggedIn) {
        // Will show login prompt, don't advance step
        return;
      }
      // User is logged in, check eligibility
      if (userId) {
        checkTrialEligibility(userId);
      }
      return;
    }

    if (type.id === "session") {
      // Session with pass requires authentication and active pass
      if (!isLoggedIn) {
        return;
      }
      // Check if user has active passes (non-trial)
      const nonTrialPasses = activePasses.filter(p => p.pass_type !== "trial");
      if (nonTrialPasses.length === 0) {
        // No passes available - will show message
        return;
      }
      // If only one pass, auto-select it
      if (nonTrialPasses.length === 1) {
        setSelectedPass(nonTrialPasses[0]);
      }
      setStep(2);
      return;
    }
    
    // For consultation and coaching, redirect to Typeform
    if (type.id === "consultation" || type.id === "coaching") {
      window.open(TYPEFORM_URL, "_blank");
      return;
    }
    
    if (type.showCalendar) {
      setShowContactInfo(false);
      setStep(2);
    } else {
      setShowContactInfo(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) return;

    // For session type, must have a selected pass
    if (formData.type === "session" && !selectedPass) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un laissez-passer.",
        variant: "destructive",
      });
      return;
    }

    const bookingData: any = {
      date: selectedDate,
      time_slot: selectedTime,
      appointment_type: formData.type === "session" ? "Séance" : formData.type,
      client_name: formData.name,
      client_email: formData.email,
      client_phone: formData.phone,
      status: "confirmed",
    };

    // Link to user account if logged in
    if (userId) {
      bookingData.user_id = userId;
    }

    // Insert booking first
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
      if (import.meta.env.DEV) console.error("Booking error:", bookingError);
      return;
    }

    // If session with pass, deduct a session
    if (formData.type === "session" && userId && bookingResult) {
      const { data: deductResult, error: deductError } = await supabase.rpc(
        "deduct_session_from_pass",
        { p_user_id: userId, p_booking_id: bookingResult.id }
      );

      if (deductError || !deductResult?.[0]?.success) {
        // Rollback booking if deduction failed
        await supabase.from("bookings").delete().eq("id", bookingResult.id);
        toast({
          title: "Erreur",
          description: deductResult?.[0]?.message || "Impossible de déduire une séance de votre pass.",
          variant: "destructive",
        });
        return;
      }

      // Update local passes state
      setActivePasses(prev => prev.map(p => 
        p.id === deductResult[0].pass_id 
          ? { ...p, remaining_sessions: deductResult[0].remaining_sessions }
          : p
      ).filter(p => p.remaining_sessions > 0));

      setStep(4);
      toast({
        title: "Réservation confirmée !",
        description: `Séance réservée ! Il vous reste ${deductResult[0].remaining_sessions} séance(s) sur votre pass.`,
      });
    } else {
      setStep(4);
      toast({
        title: "Réservation confirmée !",
        description: isLoggedIn 
          ? "Votre réservation est visible dans votre espace client."
          : "Vous recevrez un email de confirmation.",
      });
    }
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Adresse",
      content: "561 rue Champlain",
      subcontent: "Joliette, QC J6E 8N7, Canada",
    },
    {
      icon: Phone,
      title: "Téléphone",
      content: "(579) 766-1221",
      href: "tel:+15797661221",
    },
    {
      icon: Mail,
      title: "Email",
      content: "contact.powerfit.ascension@powerfitascension.com",
      href: "mailto:contact.powerfit.ascension@powerfitascension.com",
    },
    {
      icon: Clock,
      title: "Horaires",
      content: "Lun-Mer: 9h-17h | Jeu-Ven: 9h-21h",
      subcontent: "Sam-Dim: 9h-14h",
    },
  ];

  return (
    <section id="booking" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium uppercase tracking-wider mb-4">
            Réservation
          </div>
          <h2 className="font-display text-4xl md:text-6xl mb-4 tracking-wider">
            PASSEZ À <span className="text-gradient">L'ACTION</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Réservez votre premier cours gratuit ou une consultation personnalisée
          </p>
        </div>

        {/* Booking Card */}
        <div className="max-w-4xl mx-auto dashboard-card p-8">
          {/* Show Contact Info for consultation/coaching */}
          {showContactInfo ? (
            <div className="space-y-6">
              <h3 className="font-display text-2xl text-center mb-8">
                Contactez-nous pour une {formData.type === "consultation" ? "Consultation bien-être" : "Session coaching"}
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {contactInfo.map((info) => (
                  <div 
                    key={info.title} 
                    className="p-6 rounded-xl border border-border bg-card/50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <info.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-display text-lg mb-2">{info.title}</h4>
                    {info.href ? (
                      <a 
                        href={info.href} 
                        className="text-foreground hover:text-primary transition-colors break-all text-sm"
                      >
                        {info.content}
                      </a>
                    ) : (
                      <p className="text-foreground text-sm">{info.content}</p>
                    )}
                    {info.subcontent && (
                      <p className="text-muted-foreground text-sm mt-1">{info.subcontent}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="hero" size="lg" className="flex-1" asChild>
                  <a href="tel:+15797661221">
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler maintenant
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="flex-1" asChild>
                  <a href="mailto:contact.powerfit.ascension@powerfitascension.com">
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer un email
                  </a>
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowContactInfo(false);
                  setFormData({ ...formData, type: "trial" });
                }} 
                className="mt-4"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour aux options
              </Button>
            </div>
          ) : (
            <>
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

              {/* Step Content */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="font-display text-2xl text-center mb-8">Choisissez votre type de rendez-vous</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {appointmentTypes.map((type) => {
                      const isSessionType = type.id === "session";
                      const nonTrialPasses = activePasses.filter(p => p.pass_type !== "trial");
                      const hasValidPass = isSessionType && isLoggedIn && nonTrialPasses.length > 0;
                      const isDisabled = isSessionType && isLoggedIn && nonTrialPasses.length === 0;
                      
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleTypeSelect(type)}
                          disabled={trialEligibility.checking || isDisabled}
                          className={`p-6 rounded-xl border transition-all duration-300 text-left hover:border-primary/50 ${
                            formData.type === type.id 
                              ? "border-primary bg-primary/10" 
                              : "border-border bg-card"
                          } ${trialEligibility.checking || isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span className="text-3xl mb-4 block">{type.icon}</span>
                          <span className="font-medium">{type.label}</span>
                          {!type.showCalendar && (
                            <span className="block text-xs text-muted-foreground mt-2">Remplir le formulaire →</span>
                          )}
                          {isSessionType && hasValidPass && (
                            <span className="block text-xs text-primary mt-2">
                              {nonTrialPasses.reduce((sum, p) => sum + p.remaining_sessions, 0)} séance(s) disponible(s)
                            </span>
                          )}
                          {isSessionType && isLoggedIn && nonTrialPasses.length === 0 && (
                            <span className="block text-xs text-muted-foreground mt-2">Aucun pass actif</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Trial login prompt - shown when trial is selected but user not logged in */}
                  {formData.type === "trial" && !isLoggedIn && (
                    <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <LogIn className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display text-lg mb-2">Connexion requise</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Pour réserver votre cours d'essai gratuit, vous devez être connecté à votre compte.
                            Cela nous permet de vous garantir un seul essai gratuit par client.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="hero"
                              onClick={() => navigate("/auth?redirect=/#booking")}
                            >
                              <LogIn className="w-4 h-4 mr-2" />
                              Se connecter
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => navigate("/auth?redirect=/#booking")}
                            >
                              Créer un compte
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trial already used message */}
                  {formData.type === "trial" && isLoggedIn && trialEligibility.checked && !trialEligibility.eligible && (
                    <div className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-6 h-6 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display text-lg mb-2 text-orange-400">Cours d'essai déjà utilisé</h4>
                          <p className="text-sm text-foreground mb-2 font-medium">
                            ⚠️ Un seul cours d'essai gratuit est disponible par personne.
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Vous avez déjà bénéficié de votre essai gratuit avec ce compte.
                            Pour continuer votre entraînement, découvrez nos offres avantageuses :
                          </p>
                          <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                            <li>• Carte de 5 cours</li>
                            <li>• Carte de 10 cours</li>
                            <li>• Abonnement mensuel illimité</li>
                          </ul>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="hero"
                              onClick={() => {
                                const pricingSection = document.getElementById("pricing");
                                if (pricingSection) {
                                  pricingSection.scrollIntoView({ behavior: "smooth" });
                                } else {
                                  const contactSection = document.getElementById("contact");
                                  contactSection?.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Voir les offres
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const contactSection = document.getElementById("contact");
                                contactSection?.scrollIntoView({ behavior: "smooth" });
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Nous contacter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading state while checking eligibility */}
                  {trialEligibility.checking && (
                    <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Vérification de votre éligibilité...</p>
                    </div>
                  )}

                  {/* Session login prompt - shown when session is selected but user not logged in */}
                  {formData.type === "session" && !isLoggedIn && (
                    <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <LogIn className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display text-lg mb-2">Connexion requise</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Pour réserver une séance avec votre laissez-passer, vous devez être connecté à votre compte.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="hero"
                              onClick={() => navigate("/auth?redirect=/#booking")}
                            >
                              <LogIn className="w-4 h-4 mr-2" />
                              Se connecter
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => navigate("/auth?redirect=/#booking")}
                            >
                              Créer un compte
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Session no pass message */}
                  {formData.type === "session" && isLoggedIn && activePasses.filter(p => p.pass_type !== "trial").length === 0 && (
                    <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/30">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                          <Ticket className="w-6 h-6 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display text-lg mb-2">Aucun laissez-passer actif</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Vous n'avez pas de laissez-passer actif avec des séances disponibles.
                            Achetez un pass pour réserver vos séances facilement !
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="hero"
                              onClick={() => {
                                const pricingSection = document.getElementById("pricing");
                                if (pricingSection) {
                                  pricingSection.scrollIntoView({ behavior: "smooth" });
                                } else {
                                  const contactSection = document.getElementById("contact");
                                  contactSection?.scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Voir les offres
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const contactSection = document.getElementById("contact");
                                contactSection?.scrollIntoView({ behavior: "smooth" });
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Nous contacter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="font-display text-2xl text-center mb-8">Choisissez votre créneau</h3>
                  
                  {/* Pass selection for session type with multiple passes */}
                  {formData.type === "session" && activePasses.filter(p => p.pass_type !== "trial").length > 1 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-primary" />
                        Sélectionnez votre laissez-passer
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {activePasses.filter(p => p.pass_type !== "trial").map((pass) => (
                          <button
                            key={pass.id}
                            onClick={() => setSelectedPass(pass)}
                            className={`p-4 rounded-lg border text-left transition-all ${
                              selectedPass?.id === pass.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <p className="font-medium">{getPassTypeLabel(pass.pass_type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {pass.remaining_sessions}/{pass.total_sessions} séances restantes
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show selected pass info */}
                  {formData.type === "session" && selectedPass && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                      <div className="flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{getPassTypeLabel(selectedPass.pass_type)}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedPass.remaining_sessions} séance(s) restante(s) — 1 sera déduite après confirmation
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Chargement des disponibilités...
                    </div>
                  ) : availableDates.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Aucune date disponible pour le moment.<br />
                        Veuillez nous contacter directement.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Calendar */}
                      <div className="bg-muted/30 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                          <button 
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="font-display text-xl capitalize">{monthName}</span>
                          <button 
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                            <div key={day} className="text-center text-sm text-muted-foreground py-2">
                              {day}
                            </div>
                          ))}
                        </div>
                        
                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-2">
                          {paddingDays.map((_, i) => (
                            <div key={`pad-${i}`} />
                          ))}
                          {days.map((day) => {
                            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isPast = dateObj < today;
                            const isAvailable = isDateAvailable(day);
                            const isSelected = selectedDate === dateStr;
                            
                            return (
                              <button
                                key={day}
                                disabled={isPast || !isAvailable}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                                  isPast || !isAvailable
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : isAvailable
                                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                                    : "hover:bg-muted"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-primary/20" />
                            <span>Disponible</span>
                          </div>
                        </div>
                      </div>

                      {/* Time Slots */}
                      {selectedDate && (
                        <div>
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Horaires disponibles
                          </h4>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {getTimeSlotsForDate(selectedDate).map((time) => {
                              const isFull = isSlotFull(selectedDate, time);
                              const remaining = getRemainingSpots(selectedDate, time);
                              
                              return (
                                <button
                                  key={time}
                                  disabled={isFull}
                                  onClick={() => {
                                    if (!isFull) {
                                      setSelectedTime(time);
                                      setStep(3);
                                    }
                                  }}
                                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all relative ${
                                    isFull
                                      ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                                      : selectedTime === time
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <span>{time}</span>
                                  {isFull ? (
                                    <span className="block text-xs text-destructive mt-1">Complet</span>
                                  ) : remaining <= 2 ? (
                                    <span className="block text-xs text-orange-500 mt-1">{remaining} place{remaining > 1 ? 's' : ''}</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <Button variant="ghost" onClick={() => setStep(1)} className="mt-4">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="font-display text-2xl text-center mb-8">Vos informations</h3>
                  
                  {/* Login prompt for guests */}
                  {!isLoggedIn && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-6">
                      <div className="flex items-start gap-3">
                        <LogIn className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Déjà client ?</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Connectez-vous pour retrouver vos réservations dans votre espace client.
                          </p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate("/auth")}
                          >
                            Se connecter
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoggedIn && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 mb-6">
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          Connecté — Cette réservation sera liée à votre compte
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <User className="w-4 h-4 text-primary" />
                        Nom complet
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                        placeholder="Jean Dupont"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors ${isLoggedIn ? "opacity-75" : ""}`}
                        placeholder="jean@exemple.com"
                        readOnly={isLoggedIn}
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                    <Button type="submit" variant="hero" className="flex-1">
                      Confirmer la réservation
                    </Button>
                  </div>
                </form>
              )}

              {step === 4 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-display text-3xl mb-4">Réservation confirmée !</h3>
                  <p className="text-muted-foreground mb-2">
                    Merci {formData.name.split(" ")[0]} ! Votre rendez-vous est réservé.
                  </p>
                  <p className="text-foreground font-medium mb-8">
                    📅 {formatSelectedDate()} à {selectedTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Un email de confirmation vous a été envoyé à {formData.email}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-8"
                    onClick={() => {
                      setStep(1);
                      setSelectedDate(null);
                      setSelectedTime(null);
                      setFormData({ name: "", email: "", phone: "", type: "trial" });
                    }}
                  >
                    Nouvelle réservation
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Booking;
