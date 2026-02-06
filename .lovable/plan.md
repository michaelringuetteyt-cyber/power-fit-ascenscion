
# Mise à jour automatique de la galerie en temps réel

## Objectif
Lorsque l'administrateur ajoute une image dans la section "Galerie" du panneau admin, celle-ci apparaîtra automatiquement et instantanément sur la page principale sans avoir besoin de rafraîchir la page.

## Solution technique

### 1. Activer le temps réel sur la table `site_content`
Créer une migration SQL pour ajouter la table `site_content` à la publication Supabase Realtime :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;
```

### 2. Modifier le composant Gallery.tsx
Ajouter un abonnement Supabase Realtime qui écoute les changements sur la table `site_content` :

- **Écouter les événements INSERT** : Quand une nouvelle image est ajoutée, elle s'affiche immédiatement dans la galerie
- **Écouter les événements DELETE** : Quand une image est supprimée, elle disparaît automatiquement de la galerie
- **Filtrer par section "gallery"** : Ne réagir qu'aux changements concernant la galerie

### Changements dans le code

**Fichier : `src/components/Gallery.tsx`**

```typescript
useEffect(() => {
  loadGalleryImages();

  // Abonnement temps réel pour mise à jour automatique
  const channel = supabase
    .channel('gallery-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_content',
        filter: 'section=eq.gallery'
      },
      () => {
        // Recharger les images quand il y a un changement
        loadGalleryImages();
      }
    )
    .subscribe();

  // Nettoyage à la destruction du composant
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## Résultat attendu
1. L'admin ajoute une image dans `/admin/content` section Galerie
2. L'image apparaît automatiquement sur la page principale en moins d'une seconde
3. L'admin supprime une image → elle disparaît instantanément de la galerie publique
4. Aucun rafraîchissement de page nécessaire

## Fichiers à modifier
1. **Migration SQL** : Activer realtime sur `site_content`
2. **`src/components/Gallery.tsx`** : Ajouter l'abonnement temps réel

## Section technique

### Architecture
```text
+------------------+         +------------------+         +------------------+
|   Admin Panel    |  INSERT |    Supabase      |  PUSH   |   Gallery Page   |
|  /admin/content  | ------> |  site_content    | ------> |  (Index.tsx)     |
|                  |         |  + Realtime      |         |                  |
+------------------+         +------------------+         +------------------+
```

### Points techniques
- Utilisation de `postgres_changes` pour écouter les modifications en temps réel
- Filtre `section=eq.gallery` pour n'écouter que les images de la galerie
- Cleanup du channel dans le return du useEffect pour éviter les fuites mémoire
- La fonction `loadGalleryImages` est réutilisée pour recharger les données
