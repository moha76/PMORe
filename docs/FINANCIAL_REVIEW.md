# MOR — Deuxième proposition : blanc et cobalt

Version de revue, 10 octobre 2026. Direction choisie par le commanditaire après rejet de la première présentation, jugée trop discrète.

## Changements

- Navigation blanche et sélection cobalt ; textes et montants plus lisibles.
- Découvrir : composition à deux panneaux, lecture graphique des états du matching réellement retournés, fraîcheur indiquée séparément, filtres rapides illustrés, registre financier. Aucun chiffre historique ou score inventé.
- Mes dossiers : tableau par étapes et liste, recherche et filtres, choix conservé dans l'URL, reprise au bon lot. Les transitions restent celles des règles métier existantes ; pas de glisser-déposer qui modifierait arbitrairement une étape.
- Landing, monogramme, navigation et interfaces de décision/documentaires alignés sur la palette financière.
- Statuts verts/ambres/rouges conservés lorsqu'ils ont un sens métier.

## Vérifications

Compilation TypeScript/Vite et lint réussis. Les 22 tests Playwright passent, dont 16 rendus sur 8 écrans × desktop 1440×900 et mobile 390×844. Aucun débordement horizontal ni erreur JavaScript dans ces états, aucune violation détectée par les scans axe WCAG A/AA. Le contrôle automatisé ne constitue pas une certification d'accessibilité.

Interactions : filtres, changement de lot, GO, qualification sourcée, PDF, contrôle documentaire, déclaration et annulation du dépôt externe, dialogues clavier, indisponibilité API sans données de substitution, recherche des dossiers, filtre par étape, alternance tableau/liste et destination par lot.

## Preuves

La galerie index.html compare cette direction à la première proposition, avec les mêmes exemples explicitement fictifs. Elle comprend les 8 écrans sur desktop et mobile. Conserver les images à côté du fichier HTML. Résultats complets dans test-results.json ; diagnostics dans accessibility/.

## Limites et validation

Le backend réel n'est pas disponible dans cet environnement. Les mutations sont exercées dans le transport local de démonstration, sans sauvegarde réelle. Authentification, autorisations, persistance et téléchargement documentaire doivent être vérifiés sur une instance de test autorisée. Les routes historiques sont conservées ; elles ne font pas partie des 16 nouveaux états contrôlés.

Aucun changement backend, aucune intervention ni déploiement en production. Cette seconde proposition reste soumise à validation visuelle du commanditaire.
