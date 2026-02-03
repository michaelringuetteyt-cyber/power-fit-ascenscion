
# Plan: Espace Client et Gestion des Admins

## Objectif
Ajouter un espace client où les utilisateurs peuvent s'inscrire/se connecter pour gérer leur compte, et permettre aux admins d'ajouter de nouveaux administrateurs.

---

## Partie 1: Base de données

### Nouvelles tables à créer

**1. Table `profiles` (profils clients)**
- `id` (uuid, clé primaire)
- `user_id` (uuid, référence auth.users)
- `full_name` (texte)
- `email` (texte)
- `phone` (texte, optionnel)
- `avatar_url` (texte, optionnel)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**2. Table `passes` (laissez-passer)**
- `id` (uuid, clé primaire)
- `user_id` (uuid, référence profiles)
- `pass_type` (texte: "5_sessions", "10_sessions", "monthly")
- `total_sessions` (entier)
- `remaining_sessions` (entier)
- `purchase_date` (date)
- `expiry_date` (date, optionnel)
- `status` (texte: "active", "expired", "used")
- `created_at` (timestamp)

**3. Table `purchases` (achats)**
- `id` (uuid, clé primaire)
- `user_id` (uuid, référence profiles)
- `pass_id` (uuid, référence passes, optionnel)
- `item_name` (texte)
- `amount` (decimal)
- `purchase_date` (timestamp)
- `payment_status` (texte: "pending", "completed", "refunded")

### Modifications existantes
- Ajouter `user_id` à la table `bookings` pour lier les réservations aux clients connectés

### Politiques RLS
- Clients peuvent voir/modifier leur propre profil uniquement
- Clients peuvent voir leurs propres laissez-passer et achats
- Admins peuvent voir/gérer tous les profils, passes et achats
- Admins existants peuvent ajouter de nouveaux admins

---

## Partie 2: Pages et composants

### Nouvelles pages

**1. `/client` - Tableau de bord client**
- Vue d'ensemble du compte
- Nombre de laissez-passer restants (affichage prominent)
- Prochaines réservations
- Historique récent des achats

**2. `/client/profile` - Profil client**
- Formulaire de modification (nom, email, téléphone)
- Upload de photo de profil
- Changement de mot de passe

**3. `/client/bookings` - Mes réservations**
- Liste des réservations à venir
- Historique des réservations passées
- Statut de chaque réservation

**4. `/client/passes` - Mes laissez-passer**
- Affichage des laissez-passer actifs avec sessions restantes
- Historique des passes utilisés/expirés

**5. `/client/purchases` - Mes achats**
- Historique complet des achats
- Détails de chaque transaction

**6. `/auth` - Page de connexion/inscription**
- Formulaire de connexion
- Formulaire d'inscription
- Lien "Mot de passe oublié"
- Redirection vers espace client après connexion

### Nouveaux composants

**1. `ClientLayout.tsx`**
- Layout similaire à AdminLayout
- Sidebar avec navigation client
- En-tête avec nom et avatar du client
- Affichage du solde de laissez-passer

**2. `PassCard.tsx`**
- Composant pour afficher un laissez-passer
- Barre de progression des sessions restantes
- Style visuel attrayant

**3. `BookingHistoryCard.tsx`**
- Carte pour afficher une réservation
- Date, heure, type, statut

### Modification page admin

**Page `/admin/users` - Gestion des utilisateurs (nouvelle)**
- Liste des admins existants
- Bouton "Ajouter un admin"
- Formulaire pour inviter un admin (email existant)
- Liste des clients (consultation)

---

## Partie 3: Flux utilisateur

### Inscription client
```text
1. Client clique sur "Mon espace" dans le header
2. Redirigé vers /auth
3. Remplit le formulaire d'inscription
4. Confirmation email (optionnel selon config)
5. Connexion automatique
6. Création automatique du profil
7. Redirection vers /client
```

### Réservation avec compte
```text
1. Client connecté va sur la section réservation
2. Ses infos sont pré-remplies
3. La réservation est liée à son compte
4. Visible dans son historique
5. Ses laissez-passer sont mis à jour automatiquement
```

### Ajout d'admin
```text
1. Admin va sur /admin/users
2. Clique sur "Ajouter un admin"
3. Entre l'email d'un utilisateur existant
4. L'utilisateur est ajouté à la table admin_users
5. Il peut maintenant accéder à /admin
```

---

## Partie 4: Modifications du header

Ajouter un bouton "Mon espace" / "Connexion" dans le header:
- Si non connecté: "Connexion" qui mène à `/auth`
- Si connecté comme client: "Mon espace" qui mène à `/client`
- Si connecté comme admin: Ajouter aussi un lien vers "Admin"

---

## Détails techniques

### Sécurité
- Utilisation de zod pour la validation des formulaires
- RLS strictes sur toutes les tables avec données personnelles
- Fonction `is_admin()` en SECURITY DEFINER pour vérifier les droits admin
- Aucune donnée sensible dans localStorage

### Trigger automatique
- Création automatique d'un profil lors de l'inscription via trigger Supabase

### Structure des fichiers
```text
src/
  pages/
    auth/
      AuthPage.tsx
    client/
      ClientDashboard.tsx
      ClientProfile.tsx
      ClientBookings.tsx
      ClientPasses.tsx
      ClientPurchases.tsx
    admin/
      AdminUsersPage.tsx (nouveau)
  components/
    client/
      ClientLayout.tsx
      PassCard.tsx
      BookingHistoryCard.tsx
```

---

## Résumé des livrables

1. **Base de données**: 3 nouvelles tables + modifications RLS
2. **Pages client**: 5 nouvelles pages avec layout dédié
3. **Page admin**: 1 nouvelle page pour gérer les utilisateurs/admins
4. **Authentification**: Page /auth avec inscription et connexion
5. **Header**: Bouton de connexion/accès espace client
