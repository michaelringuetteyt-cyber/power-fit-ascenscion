import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Mail, Phone, ChevronLeft, ChevronRight, Check } from "lucide-react";

const Booking = () => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "trial",
  });

  // Generate calendar days for current month
  const today = new Date();
  const currentMonth = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, () => null);

  const timeSlots = [
    "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  const appointmentTypes = [
    { id: "trial", label: "Cours d'essai gratuit", icon: "🎯" },
    { id: "consultation", label: "Consultation bien-être", icon: "💪" },
    { id: "coaching", label: "Session coaching", icon: "🏆" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

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
                    onClick={() => {
                      setFormData({ ...formData, type: type.id });
                      setStep(2);
                    }}
                    className={`p-6 rounded-xl border transition-all duration-300 text-left hover:border-primary/50 ${
                      formData.type === type.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-3xl mb-4 block">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-display text-2xl text-center mb-8">Choisissez votre créneau</h3>
              
              {/* Calendar */}
              <div className="bg-muted/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-display text-xl capitalize">{currentMonth}</span>
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
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
                    const isPast = day < today.getDate();
                    const isSelected = selectedDate === day;
                    return (
                      <button
                        key={day}
                        disabled={isPast}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                          isPast
                            ? "text-muted-foreground/50 cursor-not-allowed"
                            : isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
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
                    {timeSlots.map((time) => (
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
                📅 {selectedDate} {currentMonth} à {selectedTime}
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
        </div>
      </div>
    </section>
  );
};

export default Booking;
