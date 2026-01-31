

# Plan: Refonte de la Section "3 Piliers" avec Offres Power Fit

## Objectif

Transformer la section Services pour afficher les 4 offres Power Fit Ascension avec leurs liens de paiement Square, tout en gardant les sections Coaching et Accompagnement Nutritionnel sans affichage de prix ni bouton de paiement.

## Structure Proposee

### Pilier 1: Entrainements de Groupe (avec les 4 offres)

Ce pilier contiendra les 4 cartes d'offres cliquables:

| Offre | Lien Square |
|-------|-------------|
| Carte de 5 cours | https://square.link/u/SYGFSved |
| Carte de 10 cours | https://square.link/u/cN6NZA7m |
| Acces mensuel | https://checkout.square.site/.../MSWFFISP3EBKW5374LT2KA24 |
| Engagement 12 mois | https://checkout.square.site/.../NVQAXNOXQBYSTY3HRALCVIFO |

Chaque offre aura un bouton "Reserver" qui ouvrira le lien Square dans un nouvel onglet.

### Pilier 2: Coaching Personnalise

- Garde la description actuelle
- Pas de prix affiche
- Bouton "Nous contacter" au lieu de "En savoir plus" (lien vers la section contact)

### Pilier 3: Accompagnement Nutritionnel

- Garde la description actuelle
- Pas de prix affiche
- Bouton "Nous contacter" au lieu de "En savoir plus" (lien vers la section contact)

## Modifications Techniques

### Fichier: src/components/Services.tsx

1. **Restructurer les donnees** - Ajouter un nouveau tableau `offers` pour les 4 offres Power Fit avec:
   - Nom de l'offre
   - Lien Square externe
   - Type de bouton ("external" pour paiement, "contact" pour les autres)

2. **Modifier le rendu du premier pilier** - Afficher une grille des 4 offres sous la description du pilier "Entrainements de Groupe"

3. **Modifier les boutons CTA**:
   - Pilier 1: Affiche les 4 offres avec boutons "Reserver" (ouvre lien externe)
   - Piliers 2 et 3: Bouton "Nous contacter" qui scroll vers la section contact

4. **Ajouter target="_blank" et rel="noopener noreferrer"** pour les liens externes (securite)

## Apercu Visuel

```text
+------------------------------------------+
|          ENTRAINEMENTS DE GROUPE         |
|          (Description actuelle)          |
|                                          |
|  +--------+  +--------+  +-----------+   |
|  |Carte   |  |Carte   |  |Acces      |   |
|  |5 cours |  |10 cours|  |mensuel    |   |
|  |[Payer] |  |[Payer] |  |[Payer]    |   |
|  +--------+  +--------+  +-----------+   |
|                                          |
|  +------------------+                    |
|  |Engagement 12 mois|                    |
|  |[Payer]           |                    |
|  +------------------+                    |
+------------------------------------------+

+------------------------------------------+
|        COACHING PERSONNALISE             |
|        (Description actuelle)            |
|        [Nous contacter]                  |
+------------------------------------------+

+------------------------------------------+
|     ACCOMPAGNEMENT NUTRITIONNEL          |
|        (Description actuelle)            |
|        [Nous contacter]                  |
+------------------------------------------+
```

## Avantages

- Navigation directe vers les pages de paiement Square
- Distinction claire entre services payables en ligne et services sur demande
- Interface coherente avec le design actuel
- Liens externes securises

