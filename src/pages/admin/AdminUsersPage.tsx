import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, User, Mail, Trash2, Ticket, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";
import PassManagement from "@/components/admin/PassManagement";
import ClientNotesInvoices from "@/components/admin/ClientNotesInvoices";

interface Admin {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  email?: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

const emailSchema = z.string().email("Email invalide");

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [adminsRes, profilesRes] = await Promise.all([
      supabase.from("admin_users").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);

    if (adminsRes.data) {
      // Get emails for admins from profiles
      const adminWithEmails = await Promise.all(
        adminsRes.data.map(async (admin) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", admin.user_id)
            .maybeSingle();
          return { ...admin, email: profile?.email };
        })
      );
      setAdmins(adminWithEmails);
    }

    if (profilesRes.data) {
      // Filter out admins from clients list
      const adminUserIds = adminsRes.data?.map(a => a.user_id) || [];
      const clientProfiles = profilesRes.data.filter(p => !adminUserIds.includes(p.user_id));
      setClients(clientProfiles);
    }

    setLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailResult = emailSchema.safeParse(newAdminEmail);
    if (!emailResult.success) {
      setError("Email invalide");
      return;
    }

    if (!newAdminName.trim()) {
      setError("Le nom est requis");
      return;
    }

    setAdding(true);

    // Find the user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newAdminEmail.toLowerCase())
      .maybeSingle();

    if (!profile) {
      setAdding(false);
      setError("Aucun utilisateur trouvé avec cet email. L'utilisateur doit d'abord s'inscrire.");
      return;
    }

    // Check if already admin
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (existingAdmin) {
      setAdding(false);
      setError("Cet utilisateur est déjà administrateur");
      return;
    }

    // Add to admin_users
    const { error: insertError } = await supabase
      .from("admin_users")
      .insert({ user_id: profile.user_id, name: newAdminName.trim() });

    if (insertError) {
      setAdding(false);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'administrateur",
        variant: "destructive",
      });
      return;
    }

    // Add admin role
    await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "admin" });

    setAdding(false);
    setDialogOpen(false);
    setNewAdminEmail("");
    setNewAdminName("");
    
    toast({
      title: "Administrateur ajouté",
      description: `${newAdminName} est maintenant administrateur`,
    });

    loadData();
  };

  const handleRemoveAdmin = async (admin: Admin) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === admin.user_id) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas vous retirer vous-même",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", admin.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'administrateur",
        variant: "destructive",
      });
      return;
    }

    // Remove admin role
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", admin.user_id)
      .eq("role", "admin");

    toast({
      title: "Administrateur retiré",
      description: `${admin.name} n'est plus administrateur`,
    });

    loadData();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl mb-2">
              Gestion des utilisateurs
            </h1>
            <p className="text-muted-foreground">
              Gérez les administrateurs et consultez les clients
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Ajouter un admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Ajouter un administrateur
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAdmin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email de l'utilisateur</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => {
                      setNewAdminEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="utilisateur@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nom affiché</Label>
                  <Input
                    id="adminName"
                    value={newAdminName}
                    onChange={(e) => {
                      setNewAdminName(e.target.value);
                      setError("");
                    }}
                    placeholder="Nom de l'administrateur"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  L'utilisateur doit avoir un compte existant pour être ajouté comme administrateur.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="hero" disabled={adding}>
                    {adding ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="admins" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="w-4 h-4" />
              Administrateurs ({admins.length})
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="passes" className="gap-2">
              <Ticket className="w-4 h-4" />
              Passes
            </TabsTrigger>
            <TabsTrigger value="notes-invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              Notes & Factures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admins">
            <div className="dashboard-card">
              {admins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun administrateur</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{admin.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {admin.email || "Email inconnu"} • Ajouté le{" "}
                            {format(new Date(admin.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveAdmin(admin)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <div className="dashboard-card">
              {clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun client inscrit</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground text-sm border-b border-border">
                        <th className="pb-3 font-medium">Nom</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Téléphone</th>
                        <th className="pb-3 font-medium">Inscrit le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id} className="border-b border-border/50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span>{client.full_name || "Non renseigné"}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {client.email}
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {client.phone || "—"}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {format(new Date(client.created_at), "d MMM yyyy", { locale: fr })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="passes">
            <PassManagement />
          </TabsContent>

          <TabsContent value="notes-invoices">
            <ClientNotesInvoices />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
