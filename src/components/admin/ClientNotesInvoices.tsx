import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Plus, 
  Trash2, 
  StickyNote, 
  Receipt, 
  User,
  Calendar,
  DollarSign,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface ClientNote {
  id: string;
  user_id: string;
  note: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}

interface ClientInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  amount: number;
  description: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  file_url: string | null;
  created_at: string;
  created_by: string;
}

const ClientNotesInvoices = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Profile[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Invoice dialog
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: "",
    amount: "",
    description: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: "",
    status: "pending",
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientData(selectedClient);
    } else {
      setNotes([]);
      setInvoices([]);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    const { data: adminUsers } = await supabase
      .from("admin_users")
      .select("user_id");
    
    const adminUserIds = adminUsers?.map(a => a.user_id) || [];
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    
    if (profiles) {
      const clientProfiles = profiles.filter(p => !adminUserIds.includes(p.user_id));
      setClients(clientProfiles);
    }
    setLoading(false);
  };

  const loadClientData = async (userId: string) => {
    const [notesRes, invoicesRes] = await Promise.all([
      supabase
        .from("client_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_invoices")
        .select("*")
        .eq("user_id", userId)
        .order("invoice_date", { ascending: false }),
    ]);

    if (notesRes.data) setNotes(notesRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
  };

  // Note handlers
  const openAddNote = () => {
    setEditingNote(null);
    setNoteText("");
    setNoteDialogOpen(true);
  };

  const openEditNote = (note: ClientNote) => {
    setEditingNote(note);
    setNoteText(note.note);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedClient) return;
    
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingNote) {
      const { error } = await supabase
        .from("client_notes")
        .update({ note: noteText.trim() })
        .eq("id", editingNote.id);
      
      if (error) {
        toast({ title: "Erreur", description: "Impossible de modifier la note", variant: "destructive" });
      } else {
        toast({ title: "Note modifiée" });
        loadClientData(selectedClient);
      }
    } else {
      const { error } = await supabase
        .from("client_notes")
        .insert({
          user_id: selectedClient,
          note: noteText.trim(),
          created_by: user?.id,
        });
      
      if (error) {
        toast({ title: "Erreur", description: "Impossible d'ajouter la note", variant: "destructive" });
      } else {
        toast({ title: "Note ajoutée" });
        loadClientData(selectedClient);
      }
    }
    
    setSavingNote(false);
    setNoteDialogOpen(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("client_notes")
      .delete()
      .eq("id", noteId);
    
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la note", variant: "destructive" });
    } else {
      toast({ title: "Note supprimée" });
      loadClientData(selectedClient);
    }
  };

  // Invoice handlers
  const openAddInvoice = () => {
    setEditingInvoice(null);
    setInvoiceData({
      invoice_number: `FAC-${Date.now().toString().slice(-6)}`,
      amount: "",
      description: "",
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      status: "pending",
    });
    setInvoiceDialogOpen(true);
  };

  const openEditInvoice = (invoice: ClientInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceData({
      invoice_number: invoice.invoice_number,
      amount: invoice.amount.toString(),
      description: invoice.description || "",
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || "",
      status: invoice.status,
    });
    setInvoiceDialogOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!invoiceData.invoice_number || !invoiceData.amount || !selectedClient) return;
    
    setSavingInvoice(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      invoice_number: invoiceData.invoice_number,
      amount: parseFloat(invoiceData.amount),
      description: invoiceData.description || null,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date || null,
      status: invoiceData.status,
    };
    
    if (editingInvoice) {
      const { error } = await supabase
        .from("client_invoices")
        .update(payload)
        .eq("id", editingInvoice.id);
      
      if (error) {
        toast({ title: "Erreur", description: "Impossible de modifier la facture", variant: "destructive" });
      } else {
        toast({ title: "Facture modifiée" });
        loadClientData(selectedClient);
      }
    } else {
      const { error } = await supabase
        .from("client_invoices")
        .insert({
          ...payload,
          user_id: selectedClient,
          created_by: user?.id,
        });
      
      if (error) {
        toast({ title: "Erreur", description: "Impossible d'ajouter la facture", variant: "destructive" });
      } else {
        toast({ title: "Facture ajoutée" });
        loadClientData(selectedClient);
      }
    }
    
    setSavingInvoice(false);
    setInvoiceDialogOpen(false);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const { error } = await supabase
      .from("client_invoices")
      .delete()
      .eq("id", invoiceId);
    
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la facture", variant: "destructive" });
    } else {
      toast({ title: "Facture supprimée" });
      loadClientData(selectedClient);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-500",
      paid: "bg-green-500/20 text-green-500",
      overdue: "bg-red-500/20 text-red-500",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      paid: "Payée",
      overdue: "En retard",
      cancelled: "Annulée",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const selectedClientData = clients.find(c => c.user_id === selectedClient);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <div className="dashboard-card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <Label className="mb-2 block">Sélectionner un client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.user_id} value={client.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {client.full_name || client.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedClientData && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{selectedClientData.full_name}</span>
              <span className="mx-2">•</span>
              {selectedClientData.email}
            </div>
          )}
        </div>
      </div>

      {selectedClient ? (
        <Tabs defaultValue="notes" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="notes" className="gap-2">
              <StickyNote className="w-4 h-4" />
              Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="w-4 h-4" />
              Factures ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Notes du client</h3>
                <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm" className="gap-2" onClick={openAddNote}>
                      <Plus className="w-4 h-4" />
                      Ajouter une note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingNote ? "Modifier la note" : "Nouvelle note"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Écrivez votre note ici..."
                        rows={5}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button variant="hero" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}>
                          {savingNote ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune note pour ce client</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-4 rounded-lg bg-muted/50 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(note.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => openEditNote(note)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Factures du client</h3>
                <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm" className="gap-2" onClick={openAddInvoice}>
                      <Plus className="w-4 h-4" />
                      Ajouter une facture
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingInvoice ? "Modifier la facture" : "Nouvelle facture"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>N° Facture</Label>
                          <Input
                            value={invoiceData.invoice_number}
                            onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Montant ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={invoiceData.amount}
                            onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={invoiceData.description}
                          onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                          placeholder="Description de la facture..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date de facture</Label>
                          <Input
                            type="date"
                            value={invoiceData.invoice_date}
                            onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date d'échéance</Label>
                          <Input
                            type="date"
                            value={invoiceData.due_date}
                            onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select 
                          value={invoiceData.status} 
                          onValueChange={(value) => setInvoiceData({ ...invoiceData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="paid">Payée</SelectItem>
                            <SelectItem value="overdue">En retard</SelectItem>
                            <SelectItem value="cancelled">Annulée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button 
                          variant="hero" 
                          onClick={handleSaveInvoice} 
                          disabled={savingInvoice || !invoiceData.invoice_number || !invoiceData.amount}
                        >
                          {savingInvoice ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune facture pour ce client</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground text-sm border-b border-border">
                        <th className="pb-3 font-medium">N° Facture</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Description</th>
                        <th className="pb-3 font-medium">Montant</th>
                        <th className="pb-3 font-medium">Statut</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-border/50 group">
                          <td className="py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              {invoice.invoice_number}
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: fr })}
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground max-w-[200px] truncate">
                            {invoice.description || "—"}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 font-medium">
                              <DollarSign className="w-4 h-4 text-primary" />
                              {invoice.amount.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" onClick={() => openEditInvoice(invoice)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="dashboard-card text-center py-12 text-muted-foreground">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Sélectionnez un client pour voir ses notes et factures</p>
        </div>
      )}
    </div>
  );
};

export default ClientNotesInvoices;