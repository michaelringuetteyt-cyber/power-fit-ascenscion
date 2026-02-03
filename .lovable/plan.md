
# Plan: Confirmation automatique des achats Square et ajout des laissez-passer

## Objectif
Quand un client achète une carte de cours via Square (5 cours, 10 cours, accès mensuel, engagement 12 mois), le système doit automatiquement :
1. Confirmer l'achat et l'enregistrer dans la table `purchases`
2. Créer un laissez-passer correspondant dans la table `passes` du client

---

## Approche technique

### Le défi avec Square
Les liens Square actuels (`https://square.link/...`) sont des liens de paiement externes. Pour recevoir une confirmation de paiement, nous devons :
1. Utiliser les **webhooks Square** pour recevoir les notifications de paiement
2. Créer une **Edge Function** pour traiter ces notifications
3. Lier le paiement au bon client

### Architecture proposée

```text
Client connecté → Clique sur lien Square → Paie sur Square
                                              ↓
Square envoie webhook → Edge Function "square-webhook"
                              ↓
                        Vérifie le paiement
                              ↓
                        Identifie le client (via email)
                              ↓
                        Crée l'achat (purchases)
                              ↓
                        Crée le laissez-passer (passes)
```

---

## Partie 1: Edge Function pour les webhooks Square

### Fichier: `supabase/functions/square-webhook/index.ts`

Cette fonction recevra les notifications de Square quand un paiement est complété :

- Vérifie la signature du webhook (sécurité)
- Extrait les informations de paiement (montant, email client, produit acheté)
- Recherche le client dans `profiles` par email
- Crée un enregistrement dans `purchases`
- Crée le laissez-passer correspondant dans `passes`

### Mapping des produits Square → Laissez-passer

| Produit Square | pass_type | total_sessions | expiry_date |
|----------------|-----------|----------------|-------------|
| Carte de 5 cours | 5_sessions | 5 | null (pas d'expiration) |
| Carte de 10 cours | 10_sessions | 10 | null |
| Accès mensuel | monthly | 999 (illimité) | +30 jours |
| Engagement 12 mois | yearly | 999 (illimité) | +365 jours |

---

## Partie 2: Configuration Square requise

Pour que cela fonctionne, il faudra :

1. **Créer un webhook dans Square Dashboard** :
   - URL: `https://fhwnmfarcultpaaqptej.supabase.co/functions/v1/square-webhook`
   - Événement: `payment.completed`

2. **Ajouter les secrets** :
   - `SQUARE_WEBHOOK_SIGNATURE_KEY` : pour vérifier l'authenticité des webhooks
   - `SQUARE_ACCESS_TOKEN` : (optionnel) pour vérifier les paiements via l'API

---

## Partie 3: Modification du flux utilisateur

### Option A: Lien Square personnalisé (recommandé)
Modifier les liens Square pour inclure l'email du client connecté dans les métadonnées :

1. Quand un client connecté clique sur un lien d'achat
2. On redirige vers Square avec son email en paramètre
3. Square inclut cet email dans le webhook
4. L'Edge Function peut ainsi identifier le client

### Option B: Correspondance par email
- Le client entre son email lors du paiement Square
- L'Edge Function cherche ce même email dans `profiles`
- Si trouvé, le pass est ajouté automatiquement

---

## Partie 4: Composant d'achat amélioré

### Modifications de `Services.tsx`

Pour les clients connectés :
- Afficher un message "Vous êtes connecté - votre achat sera lié à votre compte"
- Générer des liens Square personnalisés avec l'email du client

Pour les visiteurs non connectés :
- Afficher un message "Connectez-vous pour que votre achat soit automatiquement ajouté à votre compte"
- Les achats sans compte seront traités manuellement par l'admin

---

## Partie 5: Gestion admin des passes (bonus)

Ajouter une section dans l'admin pour :
- Voir les achats en attente de liaison (client non trouvé)
- Attribuer manuellement un pass à un client
- Consulter l'historique des achats automatiques

---

## Fichiers à créer/modifier

### Nouveaux fichiers
1. `supabase/functions/square-webhook/index.ts` - Edge Function pour recevoir les webhooks

### Fichiers modifiés
1. `src/components/Services.tsx` - Liens personnalisés pour clients connectés
2. `src/pages/admin/AdminUsersPage.tsx` - Section gestion des passes (optionnel)

---

## Prérequis

Avant l'implémentation, vous devrez :

1. **Configurer Square** :
   - Accéder à votre tableau de bord Square Developer
   - Créer une application si pas déjà fait
   - Configurer le webhook vers l'URL de l'Edge Function
   - Récupérer la clé de signature du webhook

2. **Ajouter les secrets** :
   - `SQUARE_WEBHOOK_SIGNATURE_KEY`

---

## Résumé des livrables

1. **Edge Function** : `square-webhook` pour recevoir et traiter les paiements
2. **Mise à jour Services.tsx** : Liens personnalisés pour clients connectés
3. **Configuration secrets** : Clé de signature Square
4. **Documentation** : Instructions pour configurer le webhook Square
