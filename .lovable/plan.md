
# Plan: Gestion manuelle des passes par l'admin avec déduction automatique

## Objectif
1. L'admin peut attribuer manuellement des laissez-passer aux clients depuis le panneau admin
2. À chaque réservation confirmée, une séance est automatiquement déduite du laissez-passer actif du client

---

## Partie 1: Panneau Admin - Attribution des passes

### Modifications de `AdminUsersPage.tsx`

Ajouter un nouvel onglet "Passes" dans la page admin des utilisateurs avec les fonctionnalités suivantes :

**1. Liste des clients avec leurs passes**
- Afficher chaque client avec son nombre de séances restantes
- Bouton "Attribuer un pass" par client

**2. Modal d'attribution de pass**
- Sélection du type de pass :
  - Carte de 5 cours (5 séances)
  - Carte de 10 cours (10 séances)
  - Accès mensuel (999 séances, expire dans 30 jours)
  - Engagement 12 mois (999 séances, expire dans 365 jours)
- Montant de l'achat (pour l'historique)
- Création automatique dans les tables `purchases` et `passes`

**3. Visualisation des passes existants**
- Liste des passes actifs par client
- Possibilité de modifier le nombre de séances restantes
- Historique des achats

---

## Partie 2: Déduction automatique à la réservation

### Nouvelle fonction base de données

Créer une fonction `deduct_session_on_booking()` qui sera appelée après chaque réservation confirmée :

```text
1. Vérifier si le booking a un user_id
2. Trouver le pass actif le plus prioritaire :
   - Passes avec expiration proche en premier
   - Puis passes avec le moins de séances
3. Déduire 1 séance
4. Si remaining_sessions = 0 → status = 'used'
5. Vérifier les expirations
```

### Trigger automatique (optionnel)

Option A: Trigger à l'insertion d'un booking
- Déduction automatique quand `status = 'confirmed'` et `user_id` est présent

Option B: Appel manuel depuis le code
- L'admin confirme une réservation → déduction
- Plus de contrôle mais nécessite une action manuelle

**Approche recommandée : Option B** - L'admin confirme les réservations depuis le panneau, ce qui déclenche la déduction.

---

## Partie 3: Confirmation de réservation par l'admin

### Modifications de `AdminBookingsPage.tsx`

Ajouter un bouton "Confirmer" sur chaque réservation en attente :
- Change le status de `pending` à `confirmed`
- Appelle la fonction de déduction de séance
- Affiche le nombre de séances restantes après déduction
- Notification si le client n'a pas de pass actif

---

## Partie 4: Flux utilisateur complet

```text
Client achète une carte chez Square
        ↓
Admin reçoit notification de paiement (hors système)
        ↓
Admin va sur /admin/users → Onglet "Passes"
        ↓
Sélectionne le client → "Attribuer un pass"
        ↓
Choisit le type (5 cours, 10 cours, mensuel, annuel)
        ↓
Pass créé + Achat enregistré
        ↓
Client réserve un cours d'essai/session
        ↓
Admin confirme la réservation depuis /admin/bookings
        ↓
1 séance déduite automatiquement du pass actif
        ↓
Client voit ses séances mises à jour dans son espace
```

---

## Fichiers à modifier

### 1. `src/pages/admin/AdminUsersPage.tsx`
- Ajout d'un onglet "Gestion des passes"
- Liste des clients avec solde de séances
- Modal d'attribution de pass
- Formulaire : type de pass, montant, confirmation

### 2. `src/pages/admin/AdminBookingsPage.tsx`
- Bouton "Confirmer" sur les réservations pending
- Indicateur du nombre de séances restantes
- Alerte si pas de pass actif

### 3. Migration base de données
- Fonction `deduct_session_from_pass(user_id uuid)` pour gérer la logique de déduction
- Mise à jour RLS si nécessaire pour permettre les inserts admin

---

## Structure de l'interface admin

```text
/admin/users
├── Onglet "Administrateurs" (existant)
├── Onglet "Clients" (existant)
└── Onglet "Passes" (nouveau)
    ├── Tableau des clients
    │   ├── Nom | Email | Séances restantes | Actions
    │   └── [Attribuer un pass] [Voir historique]
    └── Modal Attribution
        ├── Type de pass (dropdown)
        ├── Montant (input)
        └── [Confirmer]
```

---

## Résumé des livrables

1. **AdminUsersPage.tsx** : Nouvel onglet pour gérer les passes des clients
2. **AdminBookingsPage.tsx** : Confirmation de réservation avec déduction automatique
3. **Fonction SQL** : `deduct_session_from_pass()` pour la logique métier
4. **Pas besoin d'intégration Square** : Gestion 100% manuelle par l'admin
