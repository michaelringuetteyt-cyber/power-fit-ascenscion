import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, User, Mail, Trash2, Ticket, FileText, Search, UserCog, Edit } from "lucide-react";
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

interface Employee {
  id: string;
  user_id: string;
  name: string;
  can_view_dashboard: boolean;
  can_view_stats: boolean;
  can_manage_chat: boolean;
  can_manage_bookings: boolean;
  can_manage_content: boolean;
  can_manage_users: boolean;
  created_at: string;
  created_by: string;
  email?: string;
}

interface EmployeePermissions {
  dashboard: boolean;
  stats: boolean;
  chat: boolean;
  bookings: boolean;
  content: boolean;
  users: boolean;
}

const emailSchema = z.string().email("Email invalide");

const defaultPermissions: EmployeePermissions = {
  dashboard: true,
  stats: false,
  chat: false,
  bookings: false,
  content: false,
  users: false,
};

const permissionLabels: Record<keyof EmployeePermissions, string> = {
  dashboard: "Tableau de bord",
  stats: "Statistiques",
  chat: "Messages",
  bookings: "Réservations",
  content: "Contenu",
  users: "Utilisateurs (clients)",
};

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Employee state
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissions>(defaultPermissions);
  const [employeeError, setEmployeeError] = useState("");
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deleteEmployeeDialogOpen, setDeleteEmployeeDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Available clients for employee selection (clients not yet admin or employee)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  
  const availableClientsForEmployee = useMemo(() => {
    const adminUserIds = admins.map(a => a.user_id);
    const employeeUserIds = employees.map(e => e.user_id);
    const excludedIds = [...adminUserIds, ...employeeUserIds];
    return allProfiles.filter(p => !excludedIds.includes(p.user_id));
  }, [allProfiles, admins, employees]);

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    const sorted = [...clients].sort((a, b) => 
      (a.full_name || "").localeCompare(b.full_name || "", "fr")
    );
    
    if (!searchTerm) return sorted;
    
    const term = searchTerm.toLowerCase();
    return sorted.filter(client => 
      client.full_name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [adminsRes, profilesRes, employeesRes] = await Promise.all([
      supabase.from("admin_users").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_permissions").select("*").order("created_at", { ascending: false }),
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
      // Store all profiles for employee selection
      setAllProfiles(profilesRes.data);
      
      // Filter out admins and employees from clients list
      const adminUserIds = adminsRes.data?.map(a => a.user_id) || [];
      const employeeUserIds = employeesRes.data?.map(e => e.user_id) || [];
      const excludedIds = [...adminUserIds, ...employeeUserIds];
      const clientProfiles = profilesRes.data.filter(p => !excludedIds.includes(p.user_id));
      setClients(clientProfiles);
    }

    if (employeesRes.data) {
      // Get emails for employees from profiles
      const employeesWithEmails = await Promise.all(
        employeesRes.data.map(async (emp) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", emp.user_id)
            .maybeSingle();
          return { ...emp, email: profile?.email };
        })
      );
      setEmployees(employeesWithEmails);
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

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setDeleting(true);

    try {
      // Delete all associated data in parallel
      await Promise.all([
        supabase.from("passes").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("bookings").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("purchases").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("session_deductions").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("client_notes").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("client_invoices").delete().eq("user_id", clientToDelete.user_id),
        supabase.from("user_roles").delete().eq("user_id", clientToDelete.user_id),
      ]);

      // Delete the profile
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", clientToDelete.user_id);

      if (error) throw error;

      toast({
        title: "Client supprimé",
        description: `${clientToDelete.full_name || clientToDelete.email} a été supprimé`,
      });

      loadData();
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const openDeleteDialog = (client: Profile) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  // Employee handlers
  const openEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setSelectedClientId(employee.user_id);
      setEmployeeName(employee.name);
      setEmployeePermissions({
        dashboard: employee.can_view_dashboard,
        stats: employee.can_view_stats,
        chat: employee.can_manage_chat,
        bookings: employee.can_manage_bookings,
        content: employee.can_manage_content,
        users: employee.can_manage_users,
      });
    } else {
      setEditingEmployee(null);
      setSelectedClientId("");
      setEmployeeName("");
      setEmployeePermissions(defaultPermissions);
    }
    setEmployeeError("");
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError("");

    if (!editingEmployee) {
      // Adding new employee - check client selection
      if (!selectedClientId) {
        setEmployeeError("Veuillez sélectionner un client");
        return;
      }
    }

    if (!employeeName.trim()) {
      setEmployeeError("Le nom est requis");
      return;
    }

    setSavingEmployee(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Non authentifié");

      if (editingEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from("employee_permissions")
          .update({
            name: employeeName.trim(),
            can_view_dashboard: employeePermissions.dashboard,
            can_view_stats: employeePermissions.stats,
            can_manage_chat: employeePermissions.chat,
            can_manage_bookings: employeePermissions.bookings,
            can_manage_content: employeePermissions.content,
            can_manage_users: employeePermissions.users,
          })
          .eq("id", editingEmployee.id);

        if (error) throw error;

        toast({
          title: "Employé modifié",
          description: `Les permissions de ${employeeName} ont été mises à jour`,
        });
      } else {
        // Check if already admin or employee (double check)
        const [adminCheck, employeeCheck] = await Promise.all([
          supabase.from("admin_users").select("id").eq("user_id", selectedClientId).maybeSingle(),
          supabase.from("employee_permissions").select("id").eq("user_id", selectedClientId).maybeSingle(),
        ]);

        if (adminCheck.data) {
          setEmployeeError("Cet utilisateur est déjà administrateur");
          setSavingEmployee(false);
          return;
        }

        if (employeeCheck.data) {
          setEmployeeError("Cet utilisateur est déjà employé");
          setSavingEmployee(false);
          return;
        }

        // Add employee permissions
        const { error: insertError } = await supabase
          .from("employee_permissions")
          .insert({
            user_id: selectedClientId,
            name: employeeName.trim(),
            can_view_dashboard: employeePermissions.dashboard,
            can_view_stats: employeePermissions.stats,
            can_manage_chat: employeePermissions.chat,
            can_manage_bookings: employeePermissions.bookings,
            can_manage_content: employeePermissions.content,
            can_manage_users: employeePermissions.users,
            created_by: currentUser.id,
          });

        if (insertError) throw insertError;

        // Add employee role
        await supabase
          .from("user_roles")
          .insert({ user_id: selectedClientId, role: "employee" });

        toast({
          title: "Employé ajouté",
          description: `${employeeName} est maintenant employé`,
        });
      }

      setEmployeeDialogOpen(false);
      loadData();
    } catch (err) {
      console.error("Save employee error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'employé",
        variant: "destructive",
      });
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setDeleting(true);

    try {
      // Delete employee permissions
      await supabase
        .from("employee_permissions")
        .delete()
        .eq("id", employeeToDelete.id);

      // Remove employee role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", employeeToDelete.user_id)
        .eq("role", "employee");

      toast({
        title: "Employé supprimé",
        description: `${employeeToDelete.name} n'est plus employé`,
      });

      loadData();
    } catch (err) {
      console.error("Delete employee error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'employé",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteEmployeeDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const getEmployeePermissionsList = (emp: Employee) => {
    const perms: string[] = [];
    if (emp.can_view_dashboard) perms.push("Dashboard");
    if (emp.can_view_stats) perms.push("Statistiques");
    if (emp.can_manage_chat) perms.push("Messages");
    if (emp.can_manage_bookings) perms.push("Réservations");
    if (emp.can_manage_content) perms.push("Contenu");
    if (emp.can_manage_users) perms.push("Utilisateurs");
    return perms.length > 0 ? perms.join(", ") : "Aucune";
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
              Gérez les administrateurs, employés et consultez les clients
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
            <TabsTrigger value="employees" className="gap-2">
              <UserCog className="w-4 h-4" />
              Employés ({employees.length})
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
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun client inscrit</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun résultat pour "{searchTerm}"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground text-sm border-b border-border">
                        <th className="pb-3 font-medium">Nom ▲</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Téléphone</th>
                        <th className="pb-3 font-medium">Inscrit le</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
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
                          <td className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteDialog(client)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Employés ({employees.length})</h3>
                <Button variant="hero" size="sm" onClick={() => openEmployeeDialog()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un employé
                </Button>
              </div>

              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun employé</p>
                  <p className="text-sm mt-1">Ajoutez des employés avec des permissions personnalisées</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <UserCog className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.email || "Email inconnu"} • Ajouté le{" "}
                            {format(new Date(emp.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-xs text-primary mt-1">
                            Permissions: {getEmployeePermissionsList(emp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEmployeeDialog(emp)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setEmployeeToDelete(emp);
                            setDeleteEmployeeDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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

        {/* Delete Client Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Toutes les données associées à{" "}
                <strong>{clientToDelete?.full_name || clientToDelete?.email}</strong> seront supprimées :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Laissez-passer</li>
                  <li>Réservations</li>
                  <li>Achats</li>
                  <li>Notes et factures</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClient}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Employee Confirmation Dialog */}
        <AlertDialog open={deleteEmployeeDialogOpen} onOpenChange={setDeleteEmployeeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{employeeToDelete?.name}</strong> n'aura plus accès au panneau d'administration.
                Cette action ne supprime pas le compte utilisateur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEmployee}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Employee Dialog */}
        <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingEmployee ? "Modifier l'employé" : "Ajouter un employé"}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee 
                  ? "Modifiez les permissions de cet employé" 
                  : "L'utilisateur doit avoir un compte existant pour être ajouté comme employé."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEmployee} className="space-y-4 mt-4">
              {!editingEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="clientSelect">Sélectionner un client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={(value) => {
                      setSelectedClientId(value);
                      // Auto-fill the name
                      const selectedClient = availableClientsForEmployee.find(c => c.user_id === value);
                      if (selectedClient) {
                        setEmployeeName(selectedClient.full_name || "");
                      }
                      setEmployeeError("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClientsForEmployee.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Aucun client disponible
                        </div>
                      ) : (
                        availableClientsForEmployee.map((client) => (
                          <SelectItem key={client.user_id} value={client.user_id}>
                            {client.full_name || "Sans nom"} ({client.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="employeeName">Nom affiché</Label>
                <Input
                  id="employeeName"
                  value={employeeName}
                  onChange={(e) => {
                    setEmployeeName(e.target.value);
                    setEmployeeError("");
                  }}
                  placeholder="Nom de l'employé"
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                  {(Object.keys(permissionLabels) as Array<keyof EmployeePermissions>).map((key) => (
                    <div key={key} className="flex items-center space-x-3">
                      <Checkbox
                        id={`perm-${key}`}
                        checked={employeePermissions[key]}
                        onCheckedChange={(checked) => 
                          setEmployeePermissions(prev => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <Label htmlFor={`perm-${key}`} className="cursor-pointer font-normal">
                        {permissionLabels[key]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {employeeError && <p className="text-sm text-destructive">{employeeError}</p>}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmployeeDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="hero" disabled={savingEmployee}>
                  {savingEmployee ? "Enregistrement..." : editingEmployee ? "Modifier" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
