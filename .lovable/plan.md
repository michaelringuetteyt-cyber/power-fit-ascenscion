

# Ajouter l'option "Rester connecté" à la page de connexion

## Objectif
Ajouter une case à cocher "Rester connecté" sur le formulaire de connexion qui permet de contrôler la persistance de la session utilisateur.

---

## 1. Changement dans l'interface utilisateur

### Avant (actuel)
```text
+------------------------------------------+
|  Email: [_____________________]          |
|  Mot de passe: [______________] 👁       |
|                                          |
|         [ Se connecter ]                 |
+------------------------------------------+
```

### Après (modifié)
```text
+------------------------------------------+
|  Email: [_____________________]          |
|  Mot de passe: [______________] 👁       |
|                                          |
|  [✓] Rester connecté                     |
|                                          |
|         [ Se connecter ]                 |
+------------------------------------------+
```

---

## 2. Comportement attendu

| Option | Comportement |
|--------|--------------|
| **Cochée** | La session persiste après fermeture du navigateur (localStorage) |
| **Non cochée** | La session expire à la fermeture du navigateur (sessionStorage) |

- La case est affichée **uniquement** en mode connexion (pas en inscription)
- Par défaut, la case est **cochée** pour une meilleure expérience utilisateur

---

## 3. Modifications techniques

### Fichier à modifier
`src/pages/auth/AuthPage.tsx`

### Changements de state

Ajouter un nouvel état pour gérer l'option :

```typescript
const [rememberMe, setRememberMe] = useState(true);
```

### Mise à jour de handleLogin

Modifier la fonction de connexion pour utiliser le bon type de stockage :

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrors({});

  // ... validation existante ...

  setLoading(true);
  
  // Configurer le stockage selon l'option "Rester connecté"
  if (!rememberMe) {
    // Session temporaire - expire à la fermeture du navigateur
    await supabase.auth.signOut(); // Clear any existing session
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  // ... gestion d'erreur existante ...
};
```

### Ajout du composant Checkbox dans le formulaire

Ajouter entre le champ mot de passe et le bouton de connexion :

```typescript
{isLogin && (
  <div className="flex items-center space-x-2">
    <Checkbox
      id="rememberMe"
      checked={rememberMe}
      onCheckedChange={(checked) => setRememberMe(checked === true)}
    />
    <Label 
      htmlFor="rememberMe" 
      className="text-sm font-normal cursor-pointer"
    >
      Rester connecté
    </Label>
  </div>
)}
```

### Imports à ajouter

```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

---

## 4. Gestion du stockage de session

Pour implémenter correctement le "Rester connecté", on va utiliser une approche basée sur le nettoyage de session au démarrage :

1. Si `rememberMe` est **false** :
   - Stocker un flag dans `sessionStorage` indiquant une session temporaire
   - Au prochain chargement de la page (après fermeture du navigateur), le flag n'existera plus
   - On peut alors vérifier et déconnecter automatiquement

2. Si `rememberMe` est **true** :
   - Comportement par défaut de Supabase (persistSession: true dans le client)

### Implémentation simplifiée

La solution la plus simple est d'utiliser `sessionStorage` pour marquer les sessions temporaires :

```typescript
const handleLogin = async (e: React.FormEvent) => {
  // ... validation ...

  setLoading(true);
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (!error && !rememberMe) {
    // Marquer comme session temporaire
    sessionStorage.setItem('temp_session', 'true');
  }
  
  // ... reste de la logique ...
};
```

Et dans le useEffect initial :

```typescript
useEffect(() => {
  // Vérifier si c'était une session temporaire qui ne devrait pas persister
  const wasTemporarySession = sessionStorage.getItem('temp_session');
  
  // Si sessionStorage est vide mais qu'on a une session, 
  // c'est un nouveau chargement après fermeture du navigateur
  // Note: sessionStorage se vide à la fermeture du navigateur
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // ... logique existante ...
    }
  );

  // ... reste du code ...
}, [navigate]);
```

---

## 5. Position dans le formulaire

La checkbox sera placée après le champ mot de passe et avant le bouton de soumission, uniquement visible en mode connexion :

```text
Ligne 284: {errors.password && ...}
         </div>

+++ NOUVEAU: Checkbox "Rester connecté" +++

Ligne 286: {!isLogin && (
```

---

## Résumé des modifications

1. Importer le composant `Checkbox` depuis `@/components/ui/checkbox`
2. Ajouter l'état `rememberMe` (défaut: `true`)
3. Ajouter la checkbox dans le formulaire (visible uniquement en mode connexion)
4. Marquer les sessions temporaires avec `sessionStorage`
5. Vérifier au chargement si la session devrait être déconnectée

