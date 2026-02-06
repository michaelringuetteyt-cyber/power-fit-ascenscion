

# Section Employes avec Permissions Personnalisees

## Objectif
Ajouter une section "Employes" dans la gestion des utilisateurs, permettant a l'administrateur de creer des employes avec des permissions personnalisees pour chaque section du panneau admin.

---

## 1. Concept des permissions

### Sections du panneau admin disponibles
Chaque employe pourra avoir acces a une ou plusieurs de ces sections :

| Permission | Description |
|------------|-------------|
| `dashboard` | Voir le tableau de bord principal |
| `stats` | Voir les statistiques et graphiques |
| `chat` | Gerer les messages clients |
| `bookings` | Gerer les reservations |
| `content` | Modifier le contenu du site |
| `users` | Gerer les utilisateurs (clients uniquement, pas les employes) |

### Difference entre Admin et Employe
- **Admin** : Acces complet a toutes les sections + gestion des employes
- **Employe** : Acces limite aux sections cochees par l'admin

---

## 2. Interface utilisateur

### Nouvel onglet "Employes" dans la page Utilisateurs

```text
[Administrateurs] [Clients] [Employes] [Passes] [Notes & Factures]
```

### Liste des employes

```text
+------------------------------------------------------------------+
|  Employes (3)                           [+ Ajouter un employe]   |
+------------------------------------------------------------------+
| Jean Dupont                                                      |
| jean@email.com - Ajoute le 5 fev 2026                            |
| Permissions: Dashboard, Messages, Reservations                   |
|                                          [Modifier] [Supprimer]  |
+------------------------------------------------------------------+
| Marie Martin                                                     |
| marie@email.com - Ajoute le 3 fev 2026                           |
| Permissions: Statistiques, Contenu                               |
|                                          [Modifier] [Supprimer]  |
+------------------------------------------------------------------+
```

### Dialogue d'ajout/modification d'un employe

```text
+------------------------------------------+
|  Ajouter un employe                      |
+------------------------------------------+
|  Email: [_____________________]          |
|  Nom:   [_____________________]          |
|                                          |
|  Permissions:                            |
|  [x] Dashboard                           |
|  [x] Statistiques                        |
|  [x] Messages                            |
|  [ ] Reservations                        |
|  [ ] Contenu                             |
|  [ ] Utilisateurs (clients)              |
|                                          |
|           [Annuler] [Ajouter]            |
+------------------------------------------+
```

---

## 3. Migration base de donnees

### Nouvelle table `employee_permissions`

```sql
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  can_view_dashboard boolean DEFAULT false,
  can_view_stats boolean DEFAULT false,
  can_manage_chat boolean DEFAULT false,
  can_manage_bookings boolean DEFAULT false,
  can_manage_content boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL
);
```

### Ajouter le role "employee" a l'enum

```sql
ALTER TYPE public.app_role ADD VALUE 'employee';
```

### Politiques RLS

```sql
-- Seuls les admins peuvent voir/gerer les employes
CREATE POLICY "Admins can view employees" 
ON employee_permissions FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert employees" 
ON employee_permissions FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update employees" 
ON employee_permissions FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete employees" 
ON employee_permissions FOR DELETE USING (is_admin());

-- Les employes peuvent voir leurs propres permissions
CREATE POLICY "Employees can view own permissions" 
ON employee_permissions FOR SELECT USING (user_id = auth.uid());
```

### Fonction pour verifier les permissions

```sql
CREATE OR REPLACE FUNCTION public.has_employee_permission(
  p_user_id uuid, 
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_permission
    WHEN 'dashboard' THEN can_view_dashboard
    WHEN 'stats' THEN can_view_stats
    WHEN 'chat' THEN can_manage_chat
    WHEN 'bookings' THEN can_manage_bookings
    WHEN 'content' THEN can_manage_content
    WHEN 'users' THEN can_manage_users
    ELSE false
  END
  FROM employee_permissions
  WHERE user_id = p_user_id;
$$;
```

---

## 4. Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AdminUsersPage.tsx` | Ajouter onglet "Employes" avec liste, ajout, modification, suppression |
| `src/components/admin/AdminLayout.tsx` | Verifier les permissions pour afficher/masquer les liens de navigation |
| **Migration SQL** | Nouvelle table `employee_permissions` + enum + RLS + fonction |

---

## 5. Logique de controle d'acces

### Verification dans AdminLayout

L'administrateur et les employes auront acces au panneau, mais les employes ne verront que les sections pour lesquelles ils ont la permission.

```typescript
// Charger les permissions de l'employe
const [employeePermissions, setEmployeePermissions] = useState(null);

useEffect(() => {
  const loadPermissions = async () => {
    if (user && !isAdmin) {
      const { data } = await supabase
        .from("employee_permissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setEmployeePermissions(data);
      }
    }
  };
  loadPermissions();
}, [user, isAdmin]);

// Filtrer les liens de navigation selon les permissions
const filteredAdminNavItems = adminNavItems.filter(item => {
  if (isAdmin) return true; // Admin voit tout
  if (!employeePermissions) return false;
  
  const permissionMap = {
    "/admin": employeePermissions.can_view_dashboard,
    "/admin/stats": employeePermissions.can_view_stats,
    "/admin/chat": employeePermissions.can_manage_chat,
    "/admin/bookings": employeePermissions.can_manage_bookings,
    "/admin/content": employeePermissions.can_manage_content,
    "/admin/users": employeePermissions.can_manage_users,
  };
  
  return permissionMap[item.path] ?? false;
});
```

### Interface Employee

```typescript
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
```

### Ajout d'un employe

```typescript
const handleAddEmployee = async () => {
  // 1. Verifier que l'utilisateur existe
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
  
  if (!profile) {
    setError("Utilisateur non trouve");
    return;
  }
  
  // 2. Ajouter les permissions
  await supabase.from("employee_permissions").insert({
    user_id: profile.user_id,
    name: name,
    can_view_dashboard: permissions.dashboard,
    can_view_stats: permissions.stats,
    can_manage_chat: permissions.chat,
    can_manage_bookings: permissions.bookings,
    can_manage_content: permissions.content,
    can_manage_users: permissions.users,
    created_by: currentUser.id,
  });
  
  // 3. Ajouter le role employee
  await supabase.from("user_roles").insert({
    user_id: profile.user_id,
    role: "employee",
  });
};
```

### Modification des permissions

```typescript
const handleUpdateEmployee = async (employee: Employee) => {
  await supabase
    .from("employee_permissions")
    .update({
      name: employee.name,
      can_view_dashboard: employee.can_view_dashboard,
      can_view_stats: employee.can_view_stats,
      can_manage_chat: employee.can_manage_chat,
      can_manage_bookings: employee.can_manage_bookings,
      can_manage_content: employee.can_manage_content,
      can_manage_users: employee.can_manage_users,
    })
    .eq("id", employee.id);
};
```

---

## 6. Securite

### Points importants
1. **Seuls les administrateurs** peuvent ajouter/modifier/supprimer des employes
2. Les employes ne peuvent **pas** se donner plus de permissions
3. Les employes ne peuvent **pas** gerer d'autres employes (meme avec la permission "users")
4. Chaque page admin doit verifier les permissions cote serveur via RLS

### Protection des pages

Chaque page admin devra egalement verifier si l'utilisateur a la permission requise :

```typescript
// Dans chaque page admin (ex: AdminChatPage)
useEffect(() => {
  const checkAccess = async () => {
    const isAdminUser = await checkIsAdmin();
    if (isAdminUser) return; // Admin a acces
    
    const { data: perms } = await supabase
      .from("employee_permissions")
      .select("can_manage_chat")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!perms?.can_manage_chat) {
      navigate("/admin"); // Rediriger si pas de permission
    }
  };
  checkAccess();
}, []);
```

