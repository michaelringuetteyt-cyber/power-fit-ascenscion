import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Mail, Phone, ChevronLeft, ChevronRight, Check, AlertCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AvailableDate {
  id: string;
  date: string;
  time_slots: string[];
  is_active: boolean;
}

const Booking = () => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "trial",
  });

  // Fetch available dates
  useEffect(() => {
    const fetchAvailableDates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("available_dates")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching dates:", error);
      } else {
        setAvailableDates(data || []);
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

  const appointmentTypes = [
    { id: "trial", label: "Cours d'essai gratuit", icon: "🎯", showCalendar: true },
    { id: "consultation", label: "Consultation bien-être", icon: "💪", showCalendar: false },
    { id: "coaching", label: "Session coaching", icon: "🏆", showCalendar: false },
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleTypeSelect = (type: typeof appointmentTypes[0]) => {
    setFormData({ ...formData, type: type.id });
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

    const { error } = await supabase.from("bookings").insert({
      date: selectedDate,
      time_slot: selectedTime,
      appointment_type: formData.type,
      client_name: formData.name,
      client_email: formData.email,
      client_phone: formData.phone,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réservation.",
        variant: "destructive",
      });
      console.error("Booking error:", error);
    } else {
      setStep(4);
      toast({
        title: "Réservation confirmée !",
        description: "Vous recevrez un email de confirmation.",
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
                  <div className="grid md:grid-cols-3 gap-4">
                    {appointmentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type)}
                        className={`p-6 rounded-xl border transition-all duration-300 text-left hover:border-primary/50 ${
                          formData.type === type.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border bg-card"
                        }`}
                      >
                        <span className="text-3xl mb-4 block">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                        {!type.showCalendar && (
                          <span className="block text-xs text-muted-foreground mt-2">Nous contacter</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="font-display text-2xl text-center mb-8">Choisissez votre créneau</h3>
                  
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
                            {getTimeSlotsForDate(selectedDate).map((time) => (
                              <button
                                key={time}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setStep(3);
                                }}
                                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                                  selectedTime === time
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {time}
                              </button>
                            ))}
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
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                        placeholder="jean@exemple.com"
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
