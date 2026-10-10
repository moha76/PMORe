# MOR — Premium frontend

Refonte React de Morocco Opportunity Radar, issue de l'archive fournie et de la proposition validée. Cette version est destinée à la revue ; aucun déploiement ni changement backend n'est inclus.

## Développement

Node 24 a été utilisé pour la validation. Depuis `/workspace/PMORe` :

```sh
npm ci
npm run dev
npm run build
npm run lint
npm run test:preview
```

Le serveur Vite utilise le port 5174 et le préfixe `/mor-v4/`. Le proxy `/api` conserve sa destination d'origine : `http://127.0.0.1:8010`. Utiliser l'instance backend de développement autorisée pour la recette connectée, jamais une instance de production pendant la conception. Les requêtes, cookies, CSRF, identifiants et payloads existants sont conservés.

Les tâches cloud disposent déjà de leur checkout isolé : utiliser ce dépôt ; ne pas créer un worktree sans demande explicite.

## Deux modes distincts

- **Connecté** : ouvrir `/mor-v4/v5/discover` sans activer la démo. Les données viennent exclusivement de l'API. Si elle est indisponible, l'application affiche une erreur, sans générer de marchés de substitution.
- **Démonstration locale** : ouvrir `/mor-v4/v5/discover?demo=1` sur localhost ou 127.0.0.1. Les appels API sont interceptés en mémoire. Les marchés, l'entreprise et les documents sont fictifs, signalés par un bandeau permanent. Aucune mutation de démo n'est envoyée au backend. Les modifications sont perdues au rechargement ; le choix du mode reste dans sessionStorage jusqu'à « Quitter la démo ».

La landing comprend une démonstration éditoriale marquée comme illustrative. Le lien vers la démonstration interactive locale n'apparaît que sur localhost. Les CTA de connexion utilisent la route réelle `/login` ; aucune inscription ou prise de rendez-vous fictive n'est introduite.

## Préparation V5

Le commutateur existant `VITE_PREPARE_V5_ENABLED=true` active la préparation connectée. Il n'est pas activé automatiquement en mode connecté. Il faut un backend de test fournissant les endpoints V5 access/requirements/documents/reviews/history. Le mode démo l'active uniquement pour ses données locales. La préparation reste soumise à la décision GO et à l'autorisation du serveur ; les archives restent en lecture seule.

## Ce qui a changé

- Logo SVG MOR proposé, Geist et Manrope locales, palette encre/ivoire/vert, icônes Lucide.
- Landing éditoriale dédiée à `/`, distincte du travail applicatif.
- Navigation desktop/mobile commune : Découvrir, Mes dossiers, Intelligence marché, Mon entreprise.
- Parcours Étudier/Préparer/Soumettre/Suivre, avec lot conservé dans l'URL. Les étapes consultées ne sont plus affichées comme des réalisations métier.
- Nouveau registre Découvrir, filtres partageables, tableau desktop et liste mobile, erreurs et inconnus explicites.
- Mes dossiers organise les participations par mission. Les filtres/compteurs locaux sont clairement distingués du total serveur.
- Préparer met le registre et l'inspecteur côte à côte ; la synthèse détaillée s'ouvre à la demande.
- Soumettre conserve la déclaration de dépôt **externe**, ses révisions et son historique ; annulation dans un dialogue accessible.
- Entreprise place sa navigation avant les métriques, réservées à la vue d'ensemble. Les formulaires et ressources existants sont conservés.
- Preuves dans un dialogue natif avec gestion du focus et fermeture Escape.
- Les styles historiques sont dans une couche CSS `legacy`, chargée à la demande pour Entreprise et les anciennes routes. La landing et le nouveau registre ne chargent plus le fichier global historique de 24 177 lignes.
- Correction de la normalisation des extraits, invalidation des vues après rematch, décision, téléversement, revue et déclaration ; configuration TypeScript manquante restaurée.

## Compatibilité et limites

Les anciennes routes `/today`, `/opportunities`, `/workspace`, `/dossiers`, `/pilotage` et `/next` sont conservées. Mes dossiers donne accès aux actions et résultats historiques. Les données V4 au niveau consultation ne sont pas converties en données V5 par lot. Les écrans historiques sont préservés mais ne font pas partie de la recette visuelle des nouveaux écrans.

La recette locale ne certifie pas les permissions, les sauvegardes, les téléchargements ou l'authentification d'un backend réel. Une instance de test autorisée est nécessaire avant validation finale. Les scans axe automatisés couvrent les états capturés et ne remplacent pas un audit complet avec technologies d'assistance.

## Preuves et tests

Les tests Playwright vérifient le rendu desktop/mobile, les débordements et les erreurs JavaScript, les scans axe WCAG A/AA, les filtres, le lot, la décision, la qualification sourcée, le téléversement et contrôle PDF, la déclaration/annulation et les dialogues clavier. Chromium système est utilisé lorsqu'il existe ; `MOR_BROWSER_PATH` peut indiquer un autre chemin. À défaut, installer le navigateur Playwright avec `npx playwright install chromium`.

Les résultats de chaque exécution vont dans `artifacts/test-results.json`, les captures dans `artifacts/screenshots/` et les diagnostics d'accessibilité dans `artifacts/accessibility/`. Les échecs conservent une trace dans `test-results/`. Ces sorties sont ignorées par Git.

Le rapport d'audit initial est `/workspace/MOR_AUDIT_ET_PROPOSITION.md`. Les preuves visuelles destinées à la revue sont dans `/workspace/mor-evidence`. La refonte reste à valider par le commanditaire avant de la considérer comme terminée.
