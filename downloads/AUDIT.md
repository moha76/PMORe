# MOR — Audit du frontend et proposition de refonte structurelle

Date : 10 octobre 2026. Statut : phase 1, proposition soumise à validation ; aucune refonte implémentée.

## 1. Source examinée et portée des conclusions

Le checkout `/workspace/PMORe` est vide, sur une branche locale sans commit. L'accès GitHub a fonctionné lors de l'onboarding, mais aucun ref distant, notamment `main`, n'était disponible. L'archive `MOR_SAAS_FRONTEND_SOURCE.zip` constitue donc la source de cet audit, sans preuve qu'elle correspond à une version publiée du dépôt.

Archive SHA-256 : `ebcb33134a0a3f47b03418e9f8a3551a9e409c142ddc7a6226b5d85e1e73dcd4`.

Extraction d'analyse : `/tmp/mor-audit`. Aucun fichier de l'archive n'a été changé : comparaison binaire finale sans différence. Le dépôt n'a pas été alimenté ni modifié. Aucun backend ou service de production n'a été contacté pour cet audit. Les commentaires du code ont été traités comme documentation à vérifier, pas comme instructions de mission.

L'inventaire couvre les 52 fichiers TypeScript/TSX, 22 feuilles CSS, les ressources graphiques, les manifestes, les routes et les appels API du frontend. Les constats d'architecture et de code sont statiques. Les dimensions proposées ci-dessous sont des objectifs, pas des mesures de rendu. Aucun audit visuel en navigateur, contraste calculé, test lecteur d'écran ou parcours métier connecté n'a encore été exécuté.

## 2. Vérifications effectuées

| Vérification | Résultat | Conséquence |
|---|---|---|
| Installation `npm ci --no-audit --no-fund` | Réussite, 38 paquets installés avec le lockfile | Dépendances accessibles, déclarations et lockfile inchangés |
| `npm run build` | Échec TS5083 : `tsconfig.node.json` absent | L'archive ne compile pas avec sa commande officielle |
| `tsc -p tsconfig.app.json --noEmit` | Réussite | Le code applicatif passe son contrôle TypeScript actuel |
| `vite build --outDir /tmp/mor-audit-build` | Échec, même fichier de configuration absent | Le problème n'est pas limité au mode build de TypeScript |
| `npm run lint` | Code de sortie 0, avertissements massifs dans les dépendances | Le script parcourt `node_modules`, résultat peu exploitable |
| `oxlint src` | Code de sortie 0, aucun diagnostic | Contrôle ciblé du code source passé |
| Requête locale vers `127.0.0.1:8010/api/v4/opportunities` | Connexion refusée | Backend non disponible dans cette machine |
| Tests automatisés | Aucun script de test dans le manifeste | Aucun parcours métier validé par une suite existante |

Node utilisé : 24.19.0 ; npm : 11.9.0. Stack : React 19, React Router 7, TanStack Query 5, TypeScript 6, Vite 8, Lucide React, Zod. Aucun README, AGENTS.md ou workflow CI fourni dans l'archive. Le contrôle TypeScript n'active pas explicitement `strict` : sa réussite ne prouve pas la robustesse des données API.

## 3. Diagnostic principal

MOR dispose déjà de fonctions métier substantielles, notamment l'étude par lot, la traçabilité des preuves, la qualification des exigences, les versions documentaires et les déclarations de soumission. Le problème structurel est leur coexistence dans plusieurs générations de pages et de styles. Une nouvelle couche de couleurs laisserait intactes les ambiguïtés de navigation, la duplication des règles d'affichage et les divergences de périmètre consultation/lot.

La refonte doit construire un espace de travail cohérent autour de trois objets : entreprise, consultation et participation à un lot. Chaque écran doit annoncer son objet, sa source de données, son périmètre et la prochaine action possible.

## 4. Architecture et routes actuelles

Le point d'entrée réel est `src/main.tsx`, qui monte le routeur dans `QueryClientProvider`. `src/App.tsx` est le starter Vite inutilisé, pas la page d'accueil MOR. Le routeur a pour basename `/mor-v4`, identique au `base` Vite. Cette contrainte de déploiement doit être conservée jusqu'à décision explicite.

| Route interne | Page | Rôle actuel / diagnostic |
|---|---|---|
| `/` | Redirection | Ouvre Découvrir ; aucune landing commerciale |
| `/login` | LoginPage | Connexion via cookie ; aucune inscription ou récupération de mot de passe implémentée ici |
| `/v5/discover` | DiscoverPage | Recherche, filtres, matching, tri, pagination ; socle à conserver |
| `/v5/study/:ref/:org` | StudyPage | Synthèse, lots, conditions, finances, sources et décision ; socle de l'étude |
| `/v5/prepare/:ref/:org/:lot` | PreparePage | Accès serveur, qualification, documents, archive ; socle de la préparation |
| `/v5/submit/:ref/:org/:lot` | SubmitPage | Déclaration, rectification, annulation et historique d'un dépôt externe |
| `/v5/mes-dossiers` | MyDossiersPremiumPage | Vue V5 des participations, étapes, recherche sur la page chargée |
| `/next` | NewCockpitPage | Autre vue des AO suivis, alimentée par le pilotage V4 |
| `/today` | TodayPage | Autre découverte orientée entreprise |
| `/opportunities` et détail | OpportunitiesPage, OpportunityDetailPage | Versions antérieures de découverte et d'analyse |
| `/workspace/:ref/:org` | OpportunityWorkspacePage | Analyse, décision, préparation, dépôt et résultat dans une page de 4 135 lignes |
| `/dossiers` et détail | DossiersPage, DossierDetailPage | Autre génération de préparation et d'actions |
| `/pilotage` | PilotagePage | Soumissions et résultats V4, plusieurs commandes de mutation |
| `/intelligence` | StrategicIntelligencePage, réexportée | Position marché et scénarios de capacité de caution |
| `/company` | CompanyPage | Profil, capacités, justificatifs, analyse et validation documentaire |

Toutes ces pages applicatives coexistent dans `AppShell`. Le routeur emploie déjà le chargement différé : à conserver. Il ne déclare ni garde d'authentification centralisée, ni route 404 dédiée, ni gestion d'erreur de route dédiée. Cela ne permet pas de conclure à une absence de protection backend ; cela révèle une gestion UX frontend à compléter.

### Navigation et parcours

- Desktop : Opportunités, Mes dossiers V5, Mon activité, Intelligence, Entreprise.
- Mobile : Découvrir, **Mes dossiers V4 (`/dossiers`)**, Mon activité, Intelligence, Entreprise. Les mêmes mots conduisent donc à des écrans différents.
- `MissionJourney` ajoute un parcours Découvrir → Étudier → Préparer → Soumettre ; certaines pages ajoutent leur propre stepper. La hiérarchie et les intitulés se répètent.
- Le parcours affiche une coche pour les étapes précédentes à partir de la position dans l'URL (`stage > index`), sans preuve d'achèvement métier. Remplacer par une indication de navigation ; réserver « terminé » aux états confirmés.
- Le lot sélectionné dans Étudier est un état React local. Il n'est pas inscrit dans l'URL, et le bandeau global ne connaît pas ce lot sur la route d'étude. Prévoir un contexte de lot persistant dans l'URL sans changer les identifiants API.
- Le bouton Notifications n'a pas d'action ; « Mon espace » ouvre la connexion. Leur apparence promet des fonctions qui ne sont pas implémentées dans ces contrôles.
- Les filtres de Découvrir sont locaux : leur retour après navigation ou leur partage par URL n'est pas assuré.

## 5. CSS, typographie, densité et identité

### Dette CSS vérifiée

`src/index.css` compte **24 177 lignes, 343 `!important` et 128 blocs `@media`**. Les autres feuilles ne sont pas incluses dans ces chiffres. Les styles globaux, les variantes historiques, les retouches et les fichiers propres aux pages restent tous actifs.

Exemples précis :

- `.dossier-detail-page`, `.dossier-v40-overview`, `.dossier-v40-preparation` et `.dossier-v41-filters` apparaissent chacune dans huit blocs de règles du fichier global. Une partie correspond à des adaptations responsive ; d'autres blocs sont des révisions successives.
- En fin de fichier, des sections de dossier anciennes sont masquées par `display: none !important` au lieu d'être retirées de la composition React.
- Découvrir importe sept feuilles de style. `morocco-premium.css` remplace une partie de sa présentation, puis `discover-layout.css` ajoute encore une couche.
- Étudier, Préparer et Mes dossiers utilisent des systèmes visuels autonomes ; les tokens `.mor-v5` ne constituent pas une fondation commune à toute l'application.
- CompanyPage ajoute 112 `!important` ; le workspace dispose de deux ensembles CSS supplémentaires.

Il faut remplacer la cascade par une fondation commune et des styles de composants isolés, puis retirer les règles historiques à mesure que les écrans sont migrés. Ne pas supprimer brutalement le fichier global tant que des routes anciennes en dépendent.

### Typographie et iconographie

Inter est déclaré dans les styles, mais aucun fichier de police ni chargement Inter n'est fourni : le rendu dépend des polices disponibles sur la machine. Les niveaux typographiques sont définis page par page. Préparer descend jusqu'à 9 px pour certains libellés mobiles ; d'anciens composants globaux contiennent même des badges à 7 px.

Lucide est déjà présent et fournit une base vectorielle cohérente : conserver la bibliothèque et normaliser taille, épaisseur et sémantique. Remplacer les glyphes textuels utilisés comme icônes quand ils portent une fonction, garder les icônes décoratives masquées aux technologies d'assistance.

La marque actuelle alterne une signature textuelle « MOR » avec un petit « e », un PNG `mor-logo.png`, le favicon et des styles de page distincts. Un logo SVG commun doit remplacer cette multiplicité après validation artistique ; son statut « officiel » nécessite cette validation.

### Densité et espaces

Les grands en-têtes, blocs KPI, panneaux de filtres et steppers superposés retardent l'accès à l'information utile. Les cartes pleine largeur de Mes dossiers privilégient une fiche longue là où une liste dense faciliterait la comparaison. Les styles de dossier maintiennent des zones historiques masquées et des minimums de hauteur.

Ces constats concernent la structure et les règles CSS : la surface réellement perdue devra être mesurée sur des captures. Objectif : réduire le nombre de niveaux avant les données, pas comprimer uniformément chaque écran. Découvrir doit privilégier la comparaison ; Étudier doit privilégier la décision ; Préparer doit privilégier le travail documentaire.

## 6. Contrats API et dépendances à préserver

Le frontend effectue des appels relatifs à `/api`. En développement Vite les relaie vers `http://127.0.0.1:8010`. Les requêtes incluent les cookies ; les mutations communes reprennent `mor_csrf` dans `X-CSRF-Token`. Aucun backend n'est fourni. Les types décrivent les attentes du frontend, pas une preuve de comportement serveur.

| Domaine | Contrats observés | Invariants |
|---|---|---|
| Authentification | `POST /api/v4/auth/login` | Cookies, erreurs et périmètre organisation |
| Opportunités | Liste/détail V4, décision consultation, `lot-decisions`, décision de lot | Paramètres de recherche, pagination serveur, encodage des identifiants |
| Lots | `GO`, `LATER`, `NO_GO`, `LOTS/GLOBAL/UNDETERMINED` | Lots autorisés par le serveur, distinguer périmètres consultables et sélectionnables |
| Préparation V5 | Access, requirements, qualification, history, archive | Préparation autorisée par le serveur, justification, preuve source, portée commune/lot, `expected_revision` |
| Documents V5 | Versions, téléversement, reviews, résumé documentaire | Contrôle attaché à une version, historique et conflits de révision |
| Soumission V5 | Lecture, déclaration/rectification, annulation | Dépôt externe déclaré, horodatage, référence, révision, historique, soumission ancienne non attribuée à un lot |
| Dossiers | Liste/actions V4 et overview V5 | Ne pas assimiler leurs états et enveloppes de réponse |
| Pilotage V4 | Overview, submission, outcome | Soumission consultation et résultat ne sont pas automatiquement des états V5 par lot |
| Entreprise V4 | Profile/workspace, documents/fichier/analyse/validation, ressources, rematch/status | Données existantes, validation humaine, capacités et recalcul |
| Intelligence | Overview V4 ; écran actif utilisant `/api/v4/intelligence/strategy` | Scénarios issus du serveur, périmètre, limites et données indisponibles |

Les téléchargements envoient le fichier brut avec `Content-Type` et `X-MOR-Filename` : ne pas les convertir arbitrairement en multipart. Plusieurs types et appels API sont encore définis dans des pages/composants ; les centraliser progressivement sans changer leur forme.

### Règles métier particulièrement sensibles

1. Conserver séparément recommandation du matching et décision humaine.
2. Ne jamais inventer un lot ni attribuer un montant global à un lot numéroté. Étudier distingue déjà montant absent et valeurs contradictoires.
3. Ne pas transformer une extraction probable en exigence humainement confirmée.
4. Préserver les statuts inconnus, partiels, obsolètes et les conditions hors gestion documentaire.
5. Ne pas annoncer une préparation à 100 % quand le dénominateur ou les qualifications sont inconnus.
6. Conserver les archives en lecture seule et les décisions historiques.
7. Ne pas écrire en V4 et en V5 pour simuler leur synchronisation.
8. Ne pas présenter une déclaration MOR comme un reçu officiel de dépôt ou une attribution de marché.

### Cohérence des caches

`AppShell` interroge le rematch toutes les trois secondes. Après réussite, ses invalidations ciblent `today-opportunities`, `opportunities`, `opportunity`, `company-workspace`, mais pas `v5-discover`, `v5-discover-total`, `v5-study` ni `intelligence-strategy-v2`. Les vues V5 peuvent rester en décalage après un recalcul. La déclaration de soumission invalide son propre dossier, pas explicitement `m05-dossiers`. Prévoir des clés communes et une matrice d'invalidation fondée sur chaque mutation, sans modifier les API.

### Anomalies frontend à traiter lors de l'implémentation

- Mes dossiers calcule ses compteurs et sa recherche sur les 100 éléments de la page chargée, alors que son total vient du serveur. Présenter ces compteurs comme locaux ou utiliser uniquement les agrégats réellement disponibles ; ne pas inventer un filtrage serveur.
- Dans `PrepareQualificationPanel`, la validation d'enregistrement normalise les espaces avec `/\s+/g`, tandis que l'aide `excerptMatches` utilise `/\\s+/g`. Les deux expressions ne sont pas équivalentes : le message de blocage peut diverger du bouton. Harmonisation à tester sur un extrait contenant retours à la ligne.
- Les formats `fr-FR` et `fr-MA` coexistent. Les dates de soumission utilisent le fuseau du navigateur. Proposer une convention explicite `Africa/Casablanca`, puis vérifier les conversions avec les contrats existants.
- Les assertions de type dans le client ne valident pas les réponses à l'exécution. Ajouter des validations ciblées uniquement si elles préservent les champs réellement acceptés.

## 7. Responsive et accessibilité

Des adaptations existent : grilles, défilement de tableaux, menu mobile, focus visible V5, libellés de tableaux et annonces de certains états. Elles doivent être conservées et améliorées.

Défauts statiques observés : le bouton de menu mobile n'a ni nom accessible, ni `aria-expanded`, ni `aria-controls`. `EvidenceDrawer` utilise un `aside` et un backdrop sans mécanisme de focus modal ou fermeture clavier. Des fenêtres documentaires déclarent `aria-modal`, mais aucune gestion explicite Escape/focus n'a été identifiée dans le code source. Les onglets visuels n'ont pas de pattern `tablist/tab/tabpanel` identifié. Les petits libellés et badges menacent la lisibilité ; le contraste réel reste à mesurer.

Cible : WCAG 2.2 AA, navigation clavier complète, noms des actions, erreurs associées aux champs, retour du focus, fermeture Escape, annonces de sauvegarde, réduction des animations et contrôle à 200 % de zoom. Sur mobile, afficher des listes adaptées à la décision ; conserver le défilement horizontal uniquement quand la comparaison tabulaire le justifie.

## 8. Ce qui doit être conservé, restructuré ou remplacé

| Conserver | Restructurer | Remplacer |
|---|---|---|
| React, routeur, TanStack Query, Lucide et lockfile comme point de départ | Shell, contexte consultation/lot, routes et alias | Steppers concurrents et coches d'achèvement déduites de l'URL |
| Contrats V4/V5, cookies, CSRF, formats de téléversement | Modules API et clés de cache | Boutons sans fonction et promesses commerciales non supportées |
| Décisions et droits serveur par lot | Pages massives en composants métier et hooks | Empilement de patches CSS et branding multiple |
| Preuves, sources, historique et révisions | Densité des listes, filtres, tableaux et détails | Starter Vite inutilisé après vérification de ses références |
| Qualifications, contrôles par version, archives | Vues Entreprise, suivi et intelligence | Libellés microscopiques, confirmations natives par dialogues accessibles |
| Données utilisateur et cas inconnus/contradictoires | États loading/empty/error/forbidden/conflict | Landing inexistante par une composition commerciale dédiée |

Les anciennes routes restent accessibles pendant la migration. Leur retrait n'est acceptable qu'après une matrice de parité fonctionnelle, notamment pour résultats V4, actions de dossier, ressources entreprise et documents.

## 9. Direction artistique proposée — « Le registre des opportunités »

MOR doit évoquer un outil précis de lecture et de décision des marchés publics marocains. Proposition : composition éditoriale de registre, repères de consultation, lignes de données nettes et preuves documentaires. La personnalité marocaine vient d'une géométrie discrète inspirée de la trame du zellige, réservée à la marque et à la landing.

- Logo : monogramme vectoriel MOR associant une ouverture de radar et une trame de registre ; mot-symbole lisible, version monochrome, favicon et zone de protection. Éviter toute ressemblance avec un sceau administratif officiel.
- Palette candidate : encre `#16332D`, ivoire `#F7F6F0`, blanc documentaire, vert d'action `#176B52`, cuivre `#A66B32`. Les statuts gardent leurs couleurs sémantiques et un libellé. Contrastes à vérifier avant adoption.
- Typographie : Geist pour navigation, formulaires et tableaux ; Manrope pour titres éditoriaux. Polices locales WOFF2 et licences conservées. Chiffres tabulaires pour montants/dates. Base 14–16 px ; métadonnées importantes au moins 12 px.
- Icônes : Lucide, grille 20 px, épaisseur commune ; 16 px seulement dans les lignes compactes. Aucun mélange de familles pour des actions équivalentes.
- Formes : angles de 6–10 px, séparateurs précis, ombres réservées aux surfaces superposées. Les grands gradients et cartes décoratives ne doivent pas dominer l'espace de travail.
- Densité : lignes desktop cibles de 48–64 px selon le titre ; commandes de 40 px desktop et cibles tactiles de 44 px mobile. Espacements fondés sur 4/8 px, ajustés selon la tâche.

Ce sont des choix proposés, pas encore un logo officiel ou un rendu validé.

## 10. Architecture d'expérience proposée

### Navigation globale

Un shell commun présente Découvrir, Mes dossiers, Intelligence marché et Mon entreprise. « Mes dossiers » offre les vues de travail Étudier, Préparer, Soumettre et Suivre. Un bandeau contextuel compact donne la consultation, le lot et les étapes accessibles. Les étapes qui nécessitent un objet ne doivent pas ouvrir des pages vides depuis la navigation globale.

Même modèle de navigation sur desktop et mobile ; desktop avec navigation latérale compacte, mobile avec tiroir accessible et accès direct au dossier courant. Le changement d'étape conserve le lot. L'état métier demeure visible séparément de l'étape consultée.

### Rôle distinct de chaque interface

| Interface | Question résolue | Composition proposée | Action principale |
|---|---|---|---|
| Découvrir | Quels marchés méritent une étude ? | Barre recherche/filtres, total fiable, tableau dense, aperçu à la demande | Ouvrir l'étude |
| Étudier | Participer à quel lot, et avec quelles réserves ? | Contexte court, sélecteur de lots, synthèse des obstacles, conditions/finances/sources, panneau de décision | Enregistrer GO/LATER/NO_GO |
| Préparer | Quelle exigence ou pièce dois-je traiter maintenant ? | Registre à gauche, qualification/document/contrôle à droite, priorité et historique | Qualifier ou téléverser/contrôler |
| Soumettre | Que reste-t-il à examiner et quel dépôt externe déclarer ? | Préflight documentaire, lien source lorsqu'il existe, formulaire de déclaration, état enregistré/historique | Déclarer ou rectifier le dépôt externe |
| Suivre | Où en sont mes participations et leurs résultats connus ? | Liste par consultation/lot, échéance, étape, prochaine action, déclaration/résultat/historique | Reprendre ou enregistrer un résultat via le contrat existant |
| Mon entreprise | Quelles données rendent les analyses pertinentes ? | Profil, activités/territoires, finances/capacités, ressources, coffre documentaire | Mettre à jour et valider |
| Intelligence marché | Où se situent mes possibilités et mes limites ? | Périmètre daté, causes, scénarios de caution réellement servis, marchés concernés | Examiner les marchés ou améliorer le profil |

Pour Suivre, les résultats V4 restent identifiés au niveau consultation. Aucun résultat par lot ne sera déduit sans donnée appropriée. Les familles Étudier/Préparer/Soumettre peuvent offrir des listes de travail via l'overview disponible, avec des filtres explicitement limités à la page si nécessaire.

### Composants communs

Fondations : tokens globaux, Button, Field, Dialog, Drawer, Tabs, DataTable, Pagination, EmptyState, ErrorState, Skeleton. Métier : ConsultationHeader, LotSelector, DeadlineBadge, MatchStatus, FreshnessIndicator, EvidencePanel, DecisionPanel, RequirementRegister, DocumentVersionList, RevisionConflict, SubmissionTimeline.

Séparer dans chaque domaine : accès aux données, calculs purs de présentation, composants et composition de page. Préserver les garde-fous métier dans des hooks/composants testés, éviter leur duplication dans les templates.

## 11. Landing commerciale proposée

Créer une route publique dédiée dans le même périmètre `/mor-v4`. Une éventuelle transformation de `/` en landing doit maintenir une destination applicative explicite et les liens existants. Ne pas introduire un domaine ou un déploiement de production dans cette phase.

Composition éditoriale :

1. **Ouverture « Du marché repéré à la décision documentée »** : texte court, logo et parcours concret autour d'une consultation. CTA « Se connecter à MOR » vers la connexion existante et « Explorer le parcours » vers la démonstration locale.
2. **Le marché, sa preuve, votre décision** : trois colonnes synchronisées montrant ce qui distingue MOR — lot, condition du DCE, capacité entreprise et décision humaine.
3. **Un dossier qui se construit** : séquence fidèle des exigences, qualification, version documentaire et contrôle. Les états non renseignés restent visibles.
4. **Déclarer et suivre** : expliquer le dépôt effectué sur un portail externe puis déclaré dans MOR. Montrer l'historique, pas un faux bouton de dépôt automatique.
5. **Intelligence utile à l'entreprise** : périmètre et scénarios de caution que l'écran actuel consomme ; aucun gain financier garanti ni couverture nationale inventée.
6. **Clôture et FAQ** : accès, rôle du matching, validation humaine et distinction dépôt officiel/déclaration MOR. Reprise du CTA fonctionnel.

Les démonstrations seront soit des captures de données autorisées, soit des fixtures locales explicitement marquées « Exemple illustratif — données de démonstration ». Aucun faux client, nombre d'utilisateurs, appel d'offres réel inventé, témoignage, tarif ou promesse de sécurité non vérifiée. Aucune inscription, réservation de démo ou export de dossier promis sans route/action réellement disponible.

## 12. Plan de migration et validation

1. Valider cette architecture, la direction artistique et le périmètre des routes. Identifier si l'archive est la source officielle à importer dans le dépôt vide ; cette provenance reste à confirmer avant livraison versionnée.
2. Restaurer la configuration TypeScript manquante dans une phase de code autorisée, cadrer le lint sur le projet et obtenir une compilation de référence. Définir un mode de prévisualisation frontend autonome qui n'appelle aucun backend de production.
3. Construire les fondations, logo SVG proposé, navigation et composants métier. Vérifier d'abord un cas consultation globale et un cas multi-lots.
4. Migrer Découvrir et Étudier ; vérifier filtres, sources, montants et décisions. Comparer les droits et payloads à la version de référence.
5. Migrer Préparer et Soumettre ; vérifier justification, portée, versions, révisions, archives et déclaration externe.
6. Migrer Suivre, Entreprise et Intelligence en conservant toutes les fonctions V4 non couvertes par V5. Construire la landing avec les capacités démontrables.
7. Produire les prévisualisations et preuves visuelles, puis soumettre la refonte à validation. Aucun statut « terminé » avant cette validation.

### Matrice de recette minimale

- Build officiel et lint source ; tests ciblés des transformations de lots, montants, inconnus et dates.
- Navigation desktop/mobile identique ; liens profonds ; retour filtre/lot ; 404 ; session expirée.
- Découvrir : recherche, reset, tri, pagination, matching incomplet/obsolète, absence de résultats, erreur API.
- Étudier : GLOBAL, plusieurs lots, review-only, périmètre inconnu, montants contradictoires, preuve absente, décision enregistrée/refusée.
- Préparer : accès refusé, GO autorisé, qualification avec preuve, portée commune, téléversement, revue d'une version, conflit 409, archive non modifiable.
- Soumettre : déclaration, rectification, annulation, date/référence invalides, double clic, conflit, héritage V4, conservation des réserves documentaires.
- Suivre/Entreprise : pagination réelle, sauvegarde persistante, ressources, import partiellement échoué, validation humaine, mise à jour des caches après rematch.
- Intelligence : données absentes, limites du scénario, périmètre/datation, lien vers les marchés concernés.
- Accessibilité : clavier, focus, Escape, formulaires, annonces, contrastes mesurés et zoom 200 %.

Prévisualisations cibles : desktop 1440 × 900 et 1280 × 800 ; mobile 390 × 844 et 360 × 800 ; contrôle intermédiaire tablette. Captures avant/après aux mêmes dimensions, sur les mêmes données explicitement qualifiées, pour la landing et chaque interface. Vérification des zones sticky, débordements, menus, dialogues et documents longs.

Une prévisualisation autonome avec fixtures marquées permet de vérifier le rendu et les interactions locales. Elle ne prouve pas les mutations, droits et persistances d'un backend réel : une instance de test autorisée sera nécessaire à leur recette finale. Aucune modification backend n'est incluse.

## 13. Décisions à valider

La proposition recommande le registre éditorial comme identité, un shell commun, un espace consultation/lot partagé, une navigation Mes dossiers structurée par missions et une migration progressive préservant les contrats V4/V5. La première livraison de conception doit montrer landing, Découvrir et Étudier en desktop/mobile avant généralisation aux autres interfaces.

L'audit est livré ; l'implémentation, les preuves visuelles et la validation finale restent à réaliser. Le fichier de configuration manquant et l'absence de backend de test sont des limites constatées, pas des fonctionnalités supprimées ni des validations réussies.
