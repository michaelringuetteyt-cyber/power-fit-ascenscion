
# Sélection de Client pour Ajouter un Employé

## Objectif
Remplacer le champ de saisie email par un sélecteur déroulant permettant de choisir un client existant dans la liste lors de l'ajout d'un employé.

---

## 1. Changement dans l'interface utilisateur

### Avant (actuel)
```text
+------------------------------------------+
|  Ajouter un employé                      |
+------------------------------------------+
|  Email: [_____________________]          |
|  Nom:   [_____________________]          |
|  Permissions: ...                        |
+------------------------------------------+
```

### Après (modifié)
```text
+------------------------------------------+
|  Ajouter un employé                      |
+------------------------------------------+
|  Client: [Sélectionner un client ▼]      |
|          └─ Jean Dupont (jean@email.com) |
|          └─ Marie Martin (marie@...)     |
|          └─ ...                          |
|  Nom:   [Jean Dupont] (pré-rempli)       |
|  Permissions: ...                        |
+------------------------------------------+
```

---

## 2. Comportement attendu

1. Quand l'admin clique sur "Ajouter un employé", un sélecteur affiche la liste des clients disponibles
2. Chaque option du sélecteur affiche : **Nom (email)**
3. Quand un client est sélectionné :
   - Le champ "Nom affiché" est automatiquement pré-rempli avec le nom du client
   - L'admin peut modifier ce nom si souhaité
4. La liste n'affiche que les clients qui ne sont pas déjà admin ou employé

---

## 3. Modifications techniques

### Fichier à modifier
`src/pages/admin/AdminUsersPage.tsx`

### Changements de state

```typescript
// Remplacer
const [employeeEmail, setEmployeeEmail] = useState("");

// Par
const [selectedClientId, setSelectedClientId] = useState<string>("");
```

### Mise à jour du dialogue d'ajout

Remplacer le champ Input email par un composant Select :

```typescript
{!editingEmployee && (
  <div className="space-y-2">
    <Label htmlFor="clientSelect">Sélectionner un client</Label>
    <Select
      value={selectedClientId}
      onValueChange={(value) => {
        setSelectedClientId(value);
        // Auto-remplir le nom
        const selectedClient = clients.find(c => c.user_id === value);
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
        {clients.map((client) => (
          <SelectItem key={client.user_id} value={client.user_id}>
            {client.full_name || "Sans nom"} ({client.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### Mise à jour de handleSaveEmployee

```typescript
const handleSaveEmployee = async (e: React.FormEvent) => {
  // ...
  
  if (!editingEmployee) {
    // Utiliser selectedClientId au lieu de chercher par email
    if (!selectedClientId) {
      setEmployeeError("Veuillez sélectionner un client");
      return;
    }
    
    // Vérifier si déjà admin ou employé
    const [adminCheck, employeeCheck] = await Promise.all([
      supabase.from("admin_users").select("id").eq("user_id", selectedClientId).maybeSingle(),
      supabase.from("employee_permissions").select("id").eq("user_id", selectedClientId).maybeSingle(),
    ]);
    
    // ... reste de la logique avec selectedClientId au lieu de profile.user_id
  }
};
```

### Mise à jour de openEmployeeDialog

```typescript
const openEmployeeDialog = (employee?: Employee) => {
  if (employee) {
    // Mode édition - inchangé
    // ...
  } else {
    // Mode ajout
    setEditingEmployee(null);
    setSelectedClientId(""); // Réinitialiser la sélection
    setEmployeeName("");
    setEmployeePermissions(defaultPermissions);
  }
  setEmployeeError("");
  setEmployeeDialogOpen(true);
};
```

---

## 4. Imports à ajouter

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

---

## 5. Avantages de cette approche

| Avant | Après |
|-------|-------|
| Saisie manuelle d'email | Sélection dans une liste |
| Risque d'erreur de frappe | Pas d'erreur possible |
| Pas de visibilité sur les clients | Voit tous les clients disponibles |
| Recherche par email uniquement | Affiche nom ET email |

---

## Résumé des modifications

1. Ajouter les imports pour le composant Select
2. Remplacer le state `employeeEmail` par `selectedClientId`
3. Modifier le dialogue pour afficher un Select au lieu d'un Input
4. Auto-remplir le nom quand un client est sélectionné
5. Adapter `handleSaveEmployee` pour utiliser `selectedClientId`
6. Adapter `openEmployeeDialog` pour réinitialiser la sélection
