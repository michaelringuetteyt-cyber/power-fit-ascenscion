import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Ticket, Plus, User, History, Edit2, CalendarCheck, MinusCircle, Trash2, Minus } from "lucide-react";
import { format, addDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fr } from "date-fns/locale";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface Pass {
  id: string;
  user_id: string;
  pass_type: string;
  total_sessions: number;
  remaining_sessions: number;
  status: string;
  expiry_date: string | null;
  purchase_date: string;
}

interface Purchase {
  id: string;
  user_id: string;
  item_name: string;
  amount: number;
  purchase_date: string;
  payment_status: string;
}

interface SessionDeduction {
  id: string;
  user_id: string;
  pass_id: string;
  booking_id: string | null;
  deducted_at: string;
  pass_type: string;
  remaining_after: number;
  notes: string | null;
}

interface ClientWithPass extends Profile {
  totalRemainingSessions: number;
  activePasses: Pass[];
}

const PASS_TYPES = [
  { value: "5_sessions", label: "Carte de 5 cours", sessions: 5, hasExpiry: false },
  { value: "10_sessions", label: "Carte de 10 cours", sessions: 10, hasExpiry: false },
  { value: "monthly", label: "Accès mensuel", sessions: 999, hasExpiry: true, expiryDays: 30 },
  { value: "yearly", label: "Engagement 12 mois", sessions: 999, hasExpiry: true, expiryDays: 365 },
];

const PassManagement = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWithPass | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [newSessions, setNewSessions] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [deductions, setDeductions] = useState<SessionDeduction[]>([]);
  const [deletePassDialogOpen, setDeletePassDialogOpen] = useState(false);
  const [passToDelete, setPassToDelete] = useState<Pass | null>(null);
  const [deletingPass, setDeletingPass] = useState(false);
  const [deductingSession, setDeductingSession] = useState<string | null>(null);
  
  // Form state
  const [passType, setPassType] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    
    // Get all clients (non-admin profiles)
    const { data: adminUsers } = await supabase
      .from("admin_users")
      .select("user_id");
    
    const adminUserIds = adminUsers?.map(a => a.user_id) || [];
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    
    const clientProfiles = profiles?.filter(p => !adminUserIds.includes(p.user_id)) || [];
    
    // Get all active passes
    const { data: passes } = await supabase
      .from("passes")
      .select("*")
      .in("status", ["active"]);
    
    // Map clients with their pass info
    const clientsWithPasses: ClientWithPass[] = clientProfiles.map(client => {
      const clientPasses = passes?.filter(p => p.user_id === client.user_id) || [];
      const totalRemaining = clientPasses.reduce((sum, p) => sum + p.remaining_sessions, 0);
      
      return {
        ...client,
        totalRemainingSessions: totalRemaining,
        activePasses: clientPasses,
      };
    });
    
    setClients(clientsWithPasses);
    setLoading(false);
  };

  const handleAssignPass = async () => {
    if (!selectedClient || !passType || !amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const passConfig = PASS_TYPES.find(p => p.value === passType);
    if (!passConfig) return;

    setSubmitting(true);

    const expiryDate = passConfig.hasExpiry 
      ? format(addDays(new Date(), passConfig.expiryDays!), "yyyy-MM-dd")
      : null;

    // Create the pass
    const { data: newPass, error: passError } = await supabase
      .from("passes")
      .insert({
        user_id: selectedClient.user_id,
        pass_type: passType,
        total_sessions: passConfig.sessions,
        remaining_sessions: passConfig.sessions,
        status: "active",
        expiry_date: expiryDate,
      })
      .select()
      .single();

    if (passError) {
      setSubmitting(false);
      toast({
        title: "Erreur",
        description: "Impossible de créer le laissez-passer",
        variant: "destructive",
      });
      return;
    }

    // Create the purchase record
    const { error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        user_id: selectedClient.user_id,
        pass_id: newPass.id,
        item_name: passConfig.label,
        amount: parseFloat(amount),
        payment_status: "completed",
      });

    if (purchaseError) {
      console.error("Purchase error:", purchaseError);
    }

    setSubmitting(false);
    setDialogOpen(false);
    setPassType("");
    setAmount("");
    setSelectedClient(null);

    toast({
      title: "Pass attribué",
      description: `${passConfig.label} attribué à ${selectedClient.full_name || selectedClient.email}`,
    });

    loadClients();
  };

  const loadPurchaseHistory = async (client: ClientWithPass) => {
    setSelectedClient(client);
    
    // Load purchases and deductions in parallel
    const [purchasesRes, deductionsRes] = await Promise.all([
      supabase
        .from("purchases")
        .select("*")
        .eq("user_id", client.user_id)
        .order("purchase_date", { ascending: false }),
      supabase
        .from("session_deductions")
        .select("*")
        .eq("user_id", client.user_id)
        .order("deducted_at", { ascending: false })
    ]);
    
    setPurchases(purchasesRes.data || []);
    setDeductions(deductionsRes.data || []);
    setHistoryDialogOpen(true);
  };

  const handleEditSessions = async () => {
    if (!selectedPass || !newSessions) return;
    
    const sessions = parseInt(newSessions);
    if (isNaN(sessions) || sessions < 0) {
      toast({
        title: "Erreur",
        description: "Nombre de séances invalide",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("passes")
      .update({ 
        remaining_sessions: sessions,
        status: sessions === 0 ? "used" : "active"
      })
      .eq("id", selectedPass.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le pass",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pass modifié",
      description: `Séances restantes: ${sessions}`,
    });

    setEditDialogOpen(false);
    setSelectedPass(null);
    setNewSessions("");
    loadClients();
  };

  const openEditDialog = (pass: Pass) => {
    setSelectedPass(pass);
    setNewSessions(pass.remaining_sessions.toString());
    setEditDialogOpen(true);
  };

  const openDeletePassDialog = (pass: Pass) => {
    setPassToDelete(pass);
    setDeletePassDialogOpen(true);
  };

  const handleDeletePass = async () => {
    if (!passToDelete) return;
    
    setDeletingPass(true);

    try {
      // Delete associated deductions first
      await supabase
        .from("session_deductions")
        .delete()
        .eq("pass_id", passToDelete.id);

      // Delete the pass
      const { error } = await supabase
        .from("passes")
        .delete()
        .eq("id", passToDelete.id);

      if (error) throw error;

      toast({
        title: "Pass supprimé",
        description: "Le laissez-passer a été supprimé avec succès",
      });

      // Refresh data
      loadClients();
      if (selectedClient) {
        loadPurchaseHistory({
          ...selectedClient,
          activePasses: selectedClient.activePasses.filter(p => p.id !== passToDelete.id),
        });
      }
    } catch (err) {
      console.error("Delete pass error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le pass",
        variant: "destructive",
      });
    } finally {
      setDeletingPass(false);
      setDeletePassDialogOpen(false);
      setPassToDelete(null);
    }
  };

  const handleManualDeduction = async (pass: Pass) => {
    if (pass.remaining_sessions <= 0 || pass.remaining_sessions > 900) return;
    
    setDeductingSession(pass.id);

    try {
      const newRemaining = pass.remaining_sessions - 1;

      // Update the pass
      const { error: updateError } = await supabase
        .from("passes")
        .update({ 
          remaining_sessions: newRemaining,
          status: newRemaining === 0 ? "used" : "active"
        })
        .eq("id", pass.id);

      if (updateError) throw updateError;

      // Log the deduction
      const { error: insertError } = await supabase
        .from("session_deductions")
        .insert({
          user_id: pass.user_id,
          pass_id: pass.id,
          pass_type: pass.pass_type,
          remaining_after: newRemaining,
          notes: "Déduction manuelle par l'administrateur"
        });

      if (insertError) throw insertError;

      toast({
        title: "Séance déduite",
        description: `${newRemaining} séance${newRemaining > 1 ? "s" : ""} restante${newRemaining > 1 ? "s" : ""}`,
      });

      // Refresh data
      loadClients();
      if (selectedClient) {
        // Reload history with updated data
        const updatedPasses = selectedClient.activePasses.map(p => 
          p.id === pass.id ? { ...p, remaining_sessions: newRemaining, status: newRemaining === 0 ? "used" : "active" } : p
        ).filter(p => p.status === "active");
        
        loadPurchaseHistory({
          ...selectedClient,
          activePasses: updatedPasses,
          totalRemainingSessions: updatedPasses.reduce((sum, p) => sum + p.remaining_sessions, 0),
        });
      }
    } catch (err) {
      console.error("Deduction error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de déduire la séance",
        variant: "destructive",
      });
    } finally {
      setDeductingSession(null);
    }
  };

  const getPassTypeLabel = (type: string) => {
    return PASS_TYPES.find(p => p.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-muted-foreground text-sm border-b border-border">
              <th className="pb-3 font-medium">Client</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium text-center">Séances restantes</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucun client inscrit
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-b border-border/50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span>{client.full_name || "Non renseigné"}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{client.email}</td>
                  <td className="py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                      client.totalRemainingSessions > 0 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Ticket className="w-3 h-3" />
                      {client.totalRemainingSessions > 900 ? "∞" : client.totalRemainingSessions}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPurchaseHistory(client)}
                        className="gap-1"
                      >
                        <History className="w-3 h-3" />
                        Historique
                      </Button>
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setDialogOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Attribuer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attribution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Attribuer un laissez-passer
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedClient.full_name || "Client"}</p>
                <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Type de laissez-passer</Label>
                <Select value={passType} onValueChange={setPassType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PASS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} ({type.sessions === 999 ? "illimité" : `${type.sessions} séances`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Montant payé (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button variant="hero" onClick={handleAssignPass} disabled={submitting}>
                  {submitting ? "Attribution..." : "Attribuer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Historique - {selectedClient?.full_name || selectedClient?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Active Passes */}
            {selectedClient?.activePasses && selectedClient.activePasses.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  Passes actifs
                </h4>
                <div className="space-y-2">
                  {selectedClient.activePasses.map((pass) => (
                    <div key={pass.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{getPassTypeLabel(pass.pass_type)}</p>
                          <p className="text-sm text-muted-foreground">
                            {pass.remaining_sessions > 900 ? "Illimité" : `${pass.remaining_sessions} séances restantes`}
                            {pass.expiry_date && ` • Expire le ${format(new Date(pass.expiry_date), "d MMM yyyy", { locale: fr })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        {pass.remaining_sessions <= 900 && pass.remaining_sessions > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManualDeduction(pass)}
                            disabled={deductingSession === pass.id}
                            className="gap-1"
                          >
                            <Minus className="w-3 h-3" />
                            {deductingSession === pass.id ? "..." : "Déduire"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(pass)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeletePassDialog(pass)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Achats
              </h4>
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun achat enregistré
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{purchase.item_name}</p>
                        <p className="font-medium">{purchase.amount}€</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(purchase.purchase_date), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deductions History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-orange-500" />
                Historique des déductions
              </h4>
              {deductions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune déduction enregistrée
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{getPassTypeLabel(deduction.pass_type)}</p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          Reste: {deduction.remaining_after > 900 ? "∞" : deduction.remaining_after}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <CalendarCheck className="w-3 h-3" />
                        {format(new Date(deduction.deducted_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                      {deduction.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{deduction.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sessions Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Modifier le nombre de séances
            </DialogTitle>
          </DialogHeader>
          {selectedPass && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{getPassTypeLabel(selectedPass.pass_type)}</p>
                <p className="text-sm text-muted-foreground">
                  Actuellement: {selectedPass.remaining_sessions} séances
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Nouveau nombre de séances</Label>
                <Input
                  type="number"
                  min="0"
                  value={newSessions}
                  onChange={(e) => setNewSessions(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button variant="hero" onClick={handleEditSessions}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Pass Confirmation Dialog */}
      <AlertDialog open={deletePassDialogOpen} onOpenChange={setDeletePassDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce laissez-passer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le laissez-passer{" "}
              <strong>{passToDelete && getPassTypeLabel(passToDelete.pass_type)}</strong>{" "}
              et tout son historique de déductions seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPass}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePass}
              disabled={deletingPass}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPass ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PassManagement;
