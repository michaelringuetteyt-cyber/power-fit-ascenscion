

# Sélection de Client pour Ajouter un Admin

## Objectif
Remplacer le champ de saisie email par un sélecteur déroulant permettant de choisir un client existant dans la liste lors de l'ajout d'un administrateur (même fonctionnalité que pour les employés).

---

## 1. Changement dans l'interface utilisateur

### Avant (actuel)
```text
+------------------------------------------+
|  Ajouter un administrateur               |
+------------------------------------------+
|  Email: [_____________________]          |
|  Nom:   [_____________________]          |
+------------------------------------------+
```

### Après (modifié)
```text
+------------------------------------------+
|  Ajouter un administrateur               |
+------------------------------------------+
|  Client: [Sélectionner un client ▼]      |
|          └─ Jean Dupont (jean@email.com) |
|          └─ Marie Martin (marie@...)     |
|          └─ ...                          |
|  Nom:   [Jean Dupont] (pré-rempli)       |
+------------------------------------------+
```

---

## 2. Comportement attendu

1. Quand l'admin clique sur "Ajouter un administrateur", un sélecteur affiche la liste des clients disponibles
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
const [newAdminEmail, setNewAdminEmail] = useState("");

// Par
const [selectedAdminClientId, setSelectedAdminClientId] = useState<string>("");
```

### Ajout d'un memo pour les clients disponibles (admins)

Réutiliser la même logique que `availableClientsForEmployee` :

```typescript
const availableClientsForAdmin = useMemo(() => {
  const adminUserIds = admins.map(a => a.user_id);
  const employeeUserIds = employees.map(e => e.user_id);
  const excludedIds = [...adminUserIds, ...employeeUserIds];
  return allProfiles.filter(p => !excludedIds.includes(p.user_id));
}, [allProfiles, admins, employees]);
```

Note: C'est identique à `availableClientsForEmployee`, donc on peut les fusionner en un seul memo.

### Mise à jour du dialogue d'ajout admin (lignes 590-638)

Remplacer le champ Input email par un composant Select :

```typescript
<div className="space-y-2">
  <Label htmlFor="clientSelect">Sélectionner un client</Label>
  <Select
    value={selectedAdminClientId}
    onValueChange={(value) => {
      setSelectedAdminClientId(value);
      // Auto-remplir le nom
      const selectedClient = allProfiles.find(c => c.user_id === value);
      if (selectedClient) {
        setNewAdminName(selectedClient.full_name || "");
      }
      setError("");
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="Choisir un client..." />
    </SelectTrigger>
    <SelectContent>
      {availableClientsForAdmin.map((client) => (
        <SelectItem key={client.user_id} value={client.user_id}>
          {client.full_name || "Sans nom"} ({client.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Mise à jour de handleAddAdmin

```typescript
const handleAddAdmin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  // Validation du client sélectionné
  if (!selectedAdminClientId) {
    setError("Veuillez sélectionner un client");
    return;
  }

  if (!newAdminName.trim()) {
    setError("Le nom est requis");
    return;
  }

  setAdding(true);

  // Check if already admin (double check)
  const { data: existingAdmin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", selectedAdminClientId)
    .maybeSingle();

  if (existingAdmin) {
    setAdding(false);
    setError("Cet utilisateur est déjà administrateur");
    return;
  }

  // Add to admin_users
  const { error: insertError } = await supabase
    .from("admin_users")
    .insert({ user_id: selectedAdminClientId, name: newAdminName.trim() });

  // ... reste inchangé
};
```

### Mise à jour de la réinitialisation du dialogue

```typescript
// Dans setDialogOpen(false)
setDialogOpen(false);
setSelectedAdminClientId(""); // Au lieu de setNewAdminEmail("")
setNewAdminName("");
```

---

## 4. Nettoyage

- Supprimer l'import du schéma email `z.string().email()` s'il n'est plus utilisé ailleurs
- Supprimer la validation email dans `handleAddAdmin`
- Supprimer la variable `emailSchema` si elle n'est plus nécessaire

---

## 5. Avantages

| Avant | Après |
|-------|-------|
| Saisie manuelle d'email | Sélection dans une liste |
| Risque d'erreur de frappe | Pas d'erreur possible |
| Pas de visibilité sur les clients | Voit tous les clients disponibles |
| Message d'erreur si email non trouvé | Liste pré-filtrée |

---

## Résumé des modifications

1. Remplacer le state `newAdminEmail` par `selectedAdminClientId`
2. Créer ou réutiliser un memo `availableClientsForAdmin` (identique à `availableClientsForEmployee`)
3. Modifier le dialogue admin pour afficher un Select au lieu d'un Input email
4. Auto-remplir le nom quand un client est sélectionné
5. Adapter `handleAddAdmin` pour utiliser `selectedAdminClientId` directement
6. Nettoyer le code (supprimer la validation email devenue inutile)

