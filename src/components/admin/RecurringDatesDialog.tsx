import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addDays, addMonths, format, getDay, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";

interface RecurringDatesDialogProps {
  onDatesAdded: () => void;
  defaultTimeSlots: string[];
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Dimanche" },
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
];

const DURATION_OPTIONS = [
  { value: "1", label: "1 mois" },
  { value: "2", label: "2 mois" },
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "1 an" },
];

const RecurringDatesDialog = ({ onDatesAdded, defaultTimeSlots }: RecurringDatesDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [duration, setDuration] = useState("6");
  const [selectedSlots, setSelectedSlots] = useState<string[]>(defaultTimeSlots);
  const [maxBookings, setMaxBookings] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDay = (dayValue: string) => {
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const toggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort());
    }
  };

  const generateDates = () => {
    const dates: string[] = [];
    const today = startOfToday();
    const endDate = addMonths(today, parseInt(duration));
    const daysToInclude = selectedDays.map(d => parseInt(d));

    let currentDate = today;
    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      if (daysToInclude.includes(dayOfWeek)) {
        dates.push(format(currentDate, "yyyy-MM-dd"));
      }
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const handleGenerate = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un jour de la semaine",
        variant: "destructive",
      });
      return;
    }

    if (selectedSlots.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un créneau horaire",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const dates = generateDates();

    // Prepare the batch insert
    const datesToInsert = dates.map(date => ({
      date,
      time_slots: selectedSlots,
      is_active: true,
      max_bookings: maxBookings,
    }));

    // Insert in batches of 50 to avoid hitting limits
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < datesToInsert.length; i += 50) {
      const batch = datesToInsert.slice(i, i + 50);
      
      // Use upsert to skip existing dates
      const { data, error } = await supabase
        .from("available_dates")
        .upsert(batch, { 
          onConflict: "date",
          ignoreDuplicates: true 
        })
        .select();

      if (error) {
        console.error("Error inserting dates:", error);
      } else {
        successCount += data?.length || 0;
      }
    }

    skipCount = dates.length - successCount;

    setIsLoading(false);
    setIsOpen(false);
    setSelectedDays([]);

    const daysLabels = selectedDays
      .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
      .join(", ");

    toast({
      title: "Dates générées",
      description: `${successCount} dates ajoutées (${daysLabels}) pour ${DURATION_OPTIONS.find(d => d.value === duration)?.label}${skipCount > 0 ? `. ${skipCount} dates existantes ignorées.` : ""}`,
    });

    onDatesAdded();
  };

  const previewCount = selectedDays.length > 0 ? generateDates().length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarRange className="w-4 h-4" />
          Dates récurrentes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer des dates récurrentes</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          {/* Days of week selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Jours de la semaine
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedDays.includes(day.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Durée</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une durée" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time slots */}
          <div>
            <label className="text-sm font-medium mb-2 block">Créneaux horaires</label>
            <div className="grid grid-cols-3 gap-2">
              {defaultTimeSlots.map((slot) => (
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

          {/* Max bookings */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Réservations max par créneau
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxBookings}
              onChange={(e) => setMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Preview */}
          {previewCount > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary font-medium">
                📅 {previewCount} dates seront générées
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Du {format(startOfToday(), "d MMMM yyyy", { locale: fr })} au{" "}
                {format(addMonths(startOfToday(), parseInt(duration)), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            className="w-full" 
            variant="hero"
            disabled={isLoading || selectedDays.length === 0}
          >
            {isLoading ? "Génération en cours..." : "Générer les dates"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringDatesDialog;
