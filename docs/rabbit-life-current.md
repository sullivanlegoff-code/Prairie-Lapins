# Vie visuelle des lapins

Ces comportements restent dans la scène : aucun effet sur l'affection, les revenus, les croisements ou la sauvegarde. Ils utilisent un aléatoire visuel indépendant.

- **Zoomies** : un seul lapin à la fois dans toute la prairie. Premier départ après 2 à 5 minutes de prairie visible, suivants après 4 à 8 minutes ; course de 5 à 8 secondes dans la zone sûre complète de son enclos, puis retour doux vers son emplacement habituel.
- **Siestes** : premières siestes individuelles étalées entre 1 et 4 minutes, suivantes après 5 à 10 minutes. Chaque sieste dure 60 secondes visibles, avec le patch existant des yeux fermés et un petit `Zz…` sans bulle. Les lunettes restent celles du dessin existant.
- **Bisous** : occasions espacées de 90 à 180 secondes ; deux résidents du même enclos marchent vers une rencontre, se font face à courte distance, sautillent et montrent des petits cœurs pendant 1,5 seconde. Les partenaires varient. Aucun rapprochement à distance ni téléportation.

Les activités sont suspendues pendant un menu, une photo, un arrière-plan ou lorsque le lapin est hors champ. Elles ne rattrapent pas une absence. Nourrir un lapin et les répliques de Dadi ont priorité. Déplacement, départ au nid/en voyage, remplacement de partie et fermeture nettoient les états concernés. Les nouvelles courses et rencontres sont désactivées avec la réduction des mouvements ; les siestes calmes restent possibles.

Contrôle visuel préparé hors Git : `output/validation/rabbit-life-2026-10-27/check.cjs`. Il force les états de présentation dans le véritable rendu via instrumentation du navigateur ; ces captures ne prouvent pas les délais naturels. Les tests de `rabbit-life.test.ts` couvrent les horloges, l'exclusion globale, les limites et les interruptions.
