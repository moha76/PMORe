# MOR — Revue de la proposition premium

Version à valider, 10 octobre 2026. Aucun déploiement ni changement backend.

## Vérification

- Compilation TypeScript et Vite : réussie.
- Lint oxlint : réussi.
- Playwright Chromium : 21 tests réussis.
- 8 écrans × desktop 1440×900 et mobile 390×844 : aucun débordement horizontal ni erreur JavaScript dans les états vérifiés.
- Scans axe WCAG 2 A/AA et 2.1 AA : zéro violation détectée sur ces 16 états. Ce résultat ne constitue pas une certification d'accessibilité.
- Parcours exercé : recherche, filtres, changement de lot, décision GO, qualification avec extrait sourcé, PDF, revue, déclaration de dépôt externe, annulation conservant l'historique, navigation mobile, dialogue Escape, indisponibilité API sans fausses données.

## Preuves

Ouvrir index.html avec les images dans le même dossier. La galerie propose chaque écran, desktop/mobile, et comparaison avant/après. La landing est nouvelle. Les captures avant utilisent le frontend de l'archive avec la configuration TypeScript manquante restaurée et un transport local de démonstration identique. Les exemples sont fictifs. Les résultats détaillés sont dans test-results.json et accessibility/.

## Limites et validation attendue

Le backend n'était pas présent dans cet environnement. Les mutations fonctionnelles ont été exercées dans le transport local ; authentification, autorisations, persistance, téléchargements et réponses réelles devront être vérifiés sur une instance de test autorisée. Aucun serveur de production n'a été sollicité. Les routes historiques restent disponibles, mais ne sont pas incluses dans les 16 nouveaux états de recette.

Valider la direction graphique, la landing et la structure des espaces avant de qualifier la refonte de terminée. Le logo SVG est une proposition destinée à devenir l'identité officielle après cette validation.
