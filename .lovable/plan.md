

# Plan: Laissez-passer automatique pour cours d'essai gratuit (1 par client)

## Objectif
Modifier le flux de reservation du "Cours d'essai gratuit" pour :
1. Exiger que le client soit connecte (authentifie)
2. Attribuer automatiquement un laissez-passer gratuit de type "essai" (1 seance)
3. Limiter a un seul laissez-passer d'essai par client (pas de double attribution)

---

## Flux utilisateur propose

```text
Client clique sur "Cours d'essai gratuit"
        |
        v
Est-il connecte ?
   |          |
  NON        OUI
   |          |
   v          |
Redirection vers   <----+
page d'authentification
   |
   v
Connexion / Inscription
   |
   v
Retour a la reservation
        |
        v
Verification: A-t-il deja un pass "trial" ?
   |          |
  OUI        NON
   |          |
   v          v
Message:    Attribution automatique
"Vous avez  d'un pass gratuit (1 seance)
deja utilise       |
votre essai"       v
   |         Continue vers selection
   v         date/heure puis confirmation
Proposition de
contacter ou acheter
un pass
```

---

## Partie 1: Modification de la base de donnees

### Nouveau type de pass
Ajouter la gestion du type `trial` (essai gratuit) dans la table `passes` existante :
- `pass_type`: "trial"
- `total_sessions`: 1
- `remaining_sessions`: 1
- `status`: "active"

### Fonction SQL de verification et attribution
Creer une fonction `create_trial_pass_if_eligible(p_user_id uuid)` qui :
1. Verifie si l'utilisateur a deja un pass de type "trial" (peu importe son status)
2. Si non, cree un nouveau pass trial gratuit
3. Retourne le resultat (succes, deja_utilise, erreur)

```text
Logique:
1. SELECT COUNT(*) FROM passes WHERE user_id = p_user_id AND pass_type = 'trial'
2. Si count > 0 -> retourne {success: false, reason: 'already_used'}
3. Sinon -> INSERT INTO passes + retourne {success: true, pass_id: ...}
```

---

## Partie 2: Modifications du composant Booking

### Etape 1 - Selection du type (existant)
- Quand le client selectionne "Cours d'essai gratuit" :
  - Verifier s'il est connecte
  - Si non connecte -> afficher message + bouton "Se connecter" qui redirige vers `/auth?redirect=/booking`
  - Si connecte -> verifier l'eligibilite au pass trial

### Etape 2 - Verification eligibilite (nouveau)
Avant d'afficher le calendrier :
1. Appeler la fonction `create_trial_pass_if_eligible`
2. Si eligible : creer le pass automatiquement et afficher le calendrier
3. Si non eligible : afficher un message explicatif avec alternatives

### Message pour client non eligible
```text
"Vous avez deja beneficie de votre cours d'essai gratuit.

Pour continuer votre entrainement, decouvrez nos offres :
- Carte de 5 cours
- Carte de 10 cours
- Abonnement mensuel

[Voir les offres] [Nous contacter]"
```

### Etape 3 - Confirmation de reservation
- Lors de la soumission, la reservation est creee normalement
- Le pass trial a deja ete attribue a l'etape 2
- La deduction de seance se fait lors de la confirmation admin (systeme existant)

---

## Partie 3: Gestion du retour apres authentification

### Modification de AuthPage
- Accepter un parametre `redirect` dans l'URL
- Apres connexion reussie, rediriger vers ce parametre si present
- Sinon, comportement actuel (redirection selon role)

### URL de redirection
- `/auth?redirect=/booking#booking` pour revenir directement a la section reservation

---

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/Booking.tsx` | Logique d'authentification obligatoire pour trial, verification eligibilite, affichage messages |
| `src/pages/auth/AuthPage.tsx` | Support du parametre `redirect` dans l'URL |
| Migration SQL | Fonction `create_trial_pass_if_eligible()` |

---

## Details techniques

### Structure du pass trial
```text
{
  user_id: [user_id],
  pass_type: "trial",
  total_sessions: 1,
  remaining_sessions: 1,
  status: "active",
  purchase_date: CURRENT_DATE,
  expiry_date: NULL (pas d'expiration pour l'essai)
}
```

### Modification Booking.tsx - Points cles

1. **Nouvel etat pour l'eligibilite trial**
```text
const [trialEligibility, setTrialEligibility] = useState<{
  checked: boolean;
  eligible: boolean;
  passId?: string;
}>({ checked: false, eligible: false });
```

2. **Fonction de verification**
Appeler la fonction SQL lors de la selection du type "trial" pour un utilisateur connecte

3. **Rendu conditionnel**
- Si non connecte + trial -> afficher invite de connexion
- Si connecte + non eligible -> afficher message "deja utilise"
- Si connecte + eligible -> creer le pass et continuer vers calendrier

### Modification AuthPage.tsx
- Lire `searchParams.get('redirect')`
- Apres `checkRoleAndRedirect`, si redirect existe, naviguer vers ce chemin plutot que vers `/admin` ou `/client`

---

## Resume des livrables

1. **Migration SQL** : Fonction `create_trial_pass_if_eligible(p_user_id uuid)`
2. **Booking.tsx** : Authentification obligatoire + verification eligibilite + messages contextualises
3. **AuthPage.tsx** : Support du parametre `redirect` pour retour a la reservation
4. **ClientPasses.tsx** : Mise a jour du label pour afficher "Cours d'essai" pour le type "trial"

