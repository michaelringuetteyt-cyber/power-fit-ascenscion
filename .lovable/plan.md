

# Plan : Unifier l'espace Admin et Client

## Objectif
Permettre aux administrateurs de naviguer facilement entre leur espace client personnel et le panneau d'administration depuis une interface unifiee, sans avoir a se reconnecter ou changer de site.

## Solution proposee

### 1. Creer un layout unifie pour les administrateurs
Un nouveau layout qui combine les fonctionnalites client et admin dans une seule sidebar avec des sections distinctes.

### 2. Modifications a effectuer

**Fichier : `src/components/admin/AdminLayout.tsx`**
- Ajouter une section "Mon espace client" dans la sidebar admin
- Permettre l'acces aux pages client (profil, reservations, passes, achats) depuis le panneau admin
- Ajouter un switch visuel pour basculer entre les vues Admin et Client

**Fichier : `src/components/client/ClientLayout.tsx`**
- Pour les utilisateurs admin, ajouter un lien vers le panneau d'administration dans la sidebar client

### 3. Structure de navigation pour les administrateurs

```text
+----------------------------------+
|  POWER FIT ASCENSION             |
+----------------------------------+
|  [Yilver Billaudeau]             |
|  contact@powerfitascension.com   |
+----------------------------------+
|                                  |
|  -- ADMINISTRATION --            |
|  > Dashboard                     |
|  > Messages                      |
|  > Reservations                  |
|  > Contenu                       |
|  > Utilisateurs                  |
|                                  |
|  -- MON ESPACE CLIENT --         |
|  > Mon profil                    |
|  > Mes reservations              |
|  > Mes laissez-passer            |
|  > Mes achats                    |
|                                  |
+----------------------------------+
|  [Retour au site]  [Deconnexion] |
+----------------------------------+
```

### 4. Benefices
- **Navigation fluide** : Switch instantane entre admin et client
- **Une seule connexion** : Pas besoin de se reconnecter
- **Interface coherente** : Meme design pour les deux espaces
- **Acces contextuel** : L'admin peut voir son espace client tout en gerant le site

---

## Details techniques

### Modifications du AdminLayout.tsx
1. Recuperer les informations de profil client de l'admin
2. Ajouter les liens de navigation client dans la sidebar avec une section separee
3. Conserver le compteur de seances restantes pour l'admin

### Modifications du ClientLayout.tsx  
1. Verifier si l'utilisateur est admin
2. Si oui, ajouter une section "Administration" dans la navigation

### Routes (aucun changement)
Les routes existantes restent inchangees :
- `/admin/*` pour les pages admin
- `/client/*` pour les pages client

L'avantage est que vous pourrez naviguer entre les deux depuis n'importe quelle page, et les deux espaces partageront la meme session d'authentification.

