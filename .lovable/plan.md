

# Amélioration de la gestion des utilisateurs et des passes

## Objectif
Améliorer la section "Gestion des utilisateurs" avec :
1. **Section Clients** : Tri alphabétique, recherche multi-critères (nom, email, téléphone), suppression de clients
2. **Section Passes** : Suppression complète d'un pass, ou déduction séance par séance

---

## 1. Améliorations de la section Clients

### 1.1 Tri alphabétique
- Les clients seront triés par ordre alphabétique de leur nom (A→Z)
- Ceux sans nom seront affichés à la fin

### 1.2 Barre de recherche
- Champ de recherche unique permettant de filtrer par :
  - Nom du client
  - Adresse email
  - Numéro de téléphone
- Recherche en temps réel (filtre instantané pendant la saisie)

### 1.3 Suppression d'un client
- Bouton de suppression sur chaque ligne client
- Confirmation requise avant suppression (dialogue de confirmation)
- La suppression supprimera également :
  - Les passes associés
  - Les réservations associées
  - Les achats associés
  - Les notes et factures associées
  - Le rôle utilisateur

### Interface visuelle (Section Clients)
```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 Rechercher par nom, email ou téléphone...               │
├─────────────────────────────────────────────────────────────┤
│  Nom ▲        │  Email         │  Téléphone  │  Inscrit │ 🗑 │
├───────────────┼────────────────┼─────────────┼──────────┼───┤
│  Alice Martin │  alice@...     │  06...      │  1 jan   │ 🗑 │
│  Bob Dupont   │  bob@...       │  07...      │  2 jan   │ 🗑 │
│  Claire Petit │  claire@...    │  —          │  3 jan   │ 🗑 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Améliorations de la section Passes

### 2.1 Suppression complète d'un pass
- Nouveau bouton "Supprimer le pass" dans le dialogue d'historique
- Confirmation requise avec avertissement que l'action est irréversible
- Supprime le pass et l'historique des déductions associé

### 2.2 Déduction séance par séance
- Nouveau bouton "Déduire une séance" pour chaque pass actif
- Permet de déduire manuellement une séance sans réservation
- Enregistre la déduction dans l'historique avec une note "Déduction manuelle"

### Interface visuelle (Section Passes - Historique)
```text
┌──────────────────────────────────────────────────────────┐
│  Historique - Alice Martin                               │
├──────────────────────────────────────────────────────────┤
│  🎫 Passes actifs                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Carte de 10 cours                                 │  │
│  │  7 séances restantes                               │  │
│  │  [➖ Déduire] [✏️ Modifier] [🗑️ Supprimer]        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  📜 Historique des achats...                             │
│  📉 Historique des déductions...                         │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Migration base de données

Ajouter une politique RLS pour permettre aux admins de supprimer des profils :

```sql
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_admin());
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AdminUsersPage.tsx` | Ajouter recherche, tri alphabétique, bouton suppression clients |
| `src/components/admin/PassManagement.tsx` | Ajouter suppression pass, déduction manuelle séance |
| **Migration SQL** | Politique RLS pour suppression de profils |

---

## Section technique

### Logique de recherche (AdminUsersPage.tsx)

```typescript
const [searchTerm, setSearchTerm] = useState("");

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
```

### Suppression d'un client

```typescript
const handleDeleteClient = async (client: Profile) => {
  // Supprimer toutes les données associées
  await Promise.all([
    supabase.from("passes").delete().eq("user_id", client.user_id),
    supabase.from("bookings").delete().eq("user_id", client.user_id),
    supabase.from("purchases").delete().eq("user_id", client.user_id),
    supabase.from("session_deductions").delete().eq("user_id", client.user_id),
    supabase.from("client_notes").delete().eq("user_id", client.user_id),
    supabase.from("client_invoices").delete().eq("user_id", client.user_id),
    supabase.from("user_roles").delete().eq("user_id", client.user_id),
  ]);
  
  // Supprimer le profil
  await supabase.from("profiles").delete().eq("user_id", client.user_id);
};
```

### Suppression d'un pass (PassManagement.tsx)

```typescript
const handleDeletePass = async (pass: Pass) => {
  // Supprimer les déductions associées
  await supabase
    .from("session_deductions")
    .delete()
    .eq("pass_id", pass.id);
  
  // Supprimer le pass
  await supabase
    .from("passes")
    .delete()
    .eq("id", pass.id);
};
```

### Déduction manuelle d'une séance

```typescript
const handleManualDeduction = async (pass: Pass) => {
  if (pass.remaining_sessions <= 0) return;
  
  const newRemaining = pass.remaining_sessions - 1;
  
  // Mettre à jour le pass
  await supabase
    .from("passes")
    .update({ 
      remaining_sessions: newRemaining,
      status: newRemaining === 0 ? "used" : "active"
    })
    .eq("id", pass.id);
  
  // Enregistrer la déduction
  await supabase
    .from("session_deductions")
    .insert({
      user_id: pass.user_id,
      pass_id: pass.id,
      pass_type: pass.pass_type,
      remaining_after: newRemaining,
      notes: "Déduction manuelle par l'administrateur"
    });
};
```

