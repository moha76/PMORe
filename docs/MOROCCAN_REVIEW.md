# MOR — Signature marocaine

Proposition à valider, 10 octobre 2026. Palette confirmée par le commanditaire : vert profond et ivoire.

## Direction

Le zellij est une construction vectorielle originale autour de l’étoile à huit pointes et d’une trame entrelacée. Le M existant est inscrit dans cette géométrie. La signature apparaît dans le monogramme, les icônes métier, la navigation, les panneaux de lecture et la landing. Les tableaux et formulaires gardent un fond calme.

Huit icônes métier sur grille 24 px avec trait 1,65 px : radar, dossier, intelligence, entreprise, conformité, vérification, obstacle, lot. SVG indépendants dans public/mor-icons ; composants dans MorIcons.tsx. Les contrôles standard conservent Lucide.

L’interface conserve les décisions par lot, les filtres et les vues des missions. Les synthèses sont plus compactes ; sur mobile, la répartition du matching est fermée à l’ouverture et peut être dépliée sans changer la sélection. Les chiffres restent fournis par les données ; aucun score, tendance ou gain fictif n’a été ajouté.

## Validation technique

Compilation TypeScript/Vite et lint réussis. 23 tests Playwright passent. 8 écrans × desktop 1440×900 et mobile 390×844 : aucun débordement horizontal ni erreur JavaScript dans ces états. Aucun problème détecté par axe WCAG A/AA dans les 16 états capturés ; ce contrôle ne vaut pas certification d’accessibilité.

Les tests couvrent filtres, lot, décision, qualification sourcée, PDF, revue, déclaration et annulation externe, dialogues clavier, erreur API sans fausses données, tableau/liste des dossiers, filtre par mission et repli/dépli du matching mobile.

## Preuves et limites

index.html propose une comparaison avec la direction cobalt. brand.html présente les icônes, le motif et le monogramme téléchargeables. Toutes les captures applicatives emploient des exemples explicitement fictifs. Les résultats complets sont dans test-results.json et accessibility/.

Aucun changement backend ni déploiement en production. Le backend n’était pas disponible dans cet environnement. Les mutations sont testées en mémoire ; authentification, autorisations, persistance et téléchargements réels restent à valider sur une instance de test autorisée. Les interfaces historiques sont conservées et ne font pas partie des 16 nouveaux états contrôlés.

La proposition attend la validation visuelle du commanditaire.
