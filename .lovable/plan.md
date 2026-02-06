

# Amélioration de la section Notes & Factures

## Objectif
Ajouter les fonctionnalités suivantes à la section Notes & Factures :
1. **Recherche de clients** par nom, téléphone et email
2. **Tri des factures** par date (plus récentes d'abord, plus anciennes d'abord)
3. **Vue des factures les plus récentes** en priorité

---

## 1. Recherche de clients

### Fonctionnalités
- Remplacer le simple sélecteur par une barre de recherche avec filtrage
- Recherche en temps réel sur :
  - Nom complet (`full_name`)
  - Adresse email (`email`)
  - Numéro de téléphone (nécessite d'ajouter le champ à l'interface Profile)
- Affichage des résultats filtrés dans un sélecteur déroulant

### Interface visuelle
```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 Rechercher un client par nom, email ou téléphone...     │
├─────────────────────────────────────────────────────────────┤
│  ▾ Liste filtrée des clients correspondants                 │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ 👤 Marie Dupont - marie@email.com - 514-555-1234    │  │
│    │ 👤 Marc Dubois - marc@email.com - 438-555-5678      │  │
│    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tri des factures

### Options de tri
- **Plus récentes** : factures triées par `invoice_date` décroissant (par défaut)
- **Plus anciennes** : factures triées par `invoice_date` croissant
- **Date d'ajout** : factures triées par `created_at` (date de création dans le système)

### Interface visuelle
```text
┌──────────────────────────────────────────────────────────────┐
│  📋 Factures du client                       [Trier par ▾]   │
│                                              ┌─────────────┐ │
│                                              │ Plus récentes│ │
│                                              │ Plus anciennes│ │
│                                              │ Date d'ajout │ │
│                                              └─────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  N° Facture  │  Date       │  Montant  │  Statut  │  Actions │
├──────────────┼─────────────┼───────────┼──────────┼──────────┤
│  FAC-001     │  5 fév 2026 │  150.00$  │  Payée   │  📥 ✏️ 🗑 │
│  FAC-002     │  3 fév 2026 │  200.00$  │  Attente │  📥 ✏️ 🗑 │
└──────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/admin/ClientNotesInvoices.tsx` | Ajouter recherche client + tri factures |

---

## Section technique

### Modifications de l'interface Profile
Ajouter le champ `phone` qui existe déjà dans la table `profiles` :

```typescript
interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null; // Ajouter ce champ
}
```

### État pour la recherche
```typescript
const [clientSearchTerm, setClientSearchTerm] = useState("");

const filteredClients = useMemo(() => {
  if (!clientSearchTerm.trim()) return clients;
  
  const term = clientSearchTerm.toLowerCase();
  return clients.filter(client =>
    client.full_name?.toLowerCase().includes(term) ||
    client.email?.toLowerCase().includes(term) ||
    client.phone?.toLowerCase().includes(term)
  );
}, [clients, clientSearchTerm]);
```

### État pour le tri des factures
```typescript
type InvoiceSortOption = "recent" | "oldest" | "created";
const [invoiceSortBy, setInvoiceSortBy] = useState<InvoiceSortOption>("recent");

const sortedInvoices = useMemo(() => {
  const sorted = [...invoices];
  
  switch (invoiceSortBy) {
    case "recent":
      return sorted.sort((a, b) => 
        new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      );
    case "oldest":
      return sorted.sort((a, b) => 
        new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
      );
    case "created":
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    default:
      return sorted;
  }
}, [invoices, invoiceSortBy]);
```

### Mise à jour du chargement des clients
```typescript
const loadClients = async () => {
  const { data: adminUsers } = await supabase
    .from("admin_users")
    .select("user_id");
  
  const adminUserIds = adminUsers?.map(a => a.user_id) || [];
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, email, phone") // Ajouter phone
    .order("full_name");
  
  if (profiles) {
    const clientProfiles = profiles.filter(p => !adminUserIds.includes(p.user_id));
    setClients(clientProfiles);
  }
  setLoading(false);
};
```

### Composant de recherche client
```typescript
<div className="space-y-2">
  <Label>Rechercher un client</Label>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      placeholder="Rechercher par nom, email ou téléphone..."
      value={clientSearchTerm}
      onChange={(e) => setClientSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>
</div>

<Select value={selectedClient} onValueChange={setSelectedClient}>
  <SelectTrigger>
    <SelectValue placeholder="Choisir un client..." />
  </SelectTrigger>
  <SelectContent>
    {filteredClients.map((client) => (
      <SelectItem key={client.user_id} value={client.user_id}>
        <div className="flex flex-col">
          <span>{client.full_name || "Sans nom"}</span>
          <span className="text-xs text-muted-foreground">
            {client.email} {client.phone && `• ${client.phone}`}
          </span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Sélecteur de tri pour les factures
```typescript
<div className="flex items-center justify-between mb-4">
  <h3 className="font-display text-lg">Factures du client</h3>
  <div className="flex items-center gap-2">
    <Select value={invoiceSortBy} onValueChange={(v) => setInvoiceSortBy(v as InvoiceSortOption)}>
      <SelectTrigger className="w-[160px]">
        <ArrowUpDown className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Plus récentes</SelectItem>
        <SelectItem value="oldest">Plus anciennes</SelectItem>
        <SelectItem value="created">Date d'ajout</SelectItem>
      </SelectContent>
    </Select>
    {/* Bouton Ajouter une facture existant */}
  </div>
</div>
```

