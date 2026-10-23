> Parcours courant : [Missions du début actuel](missions-current.md#essai-iphone). Le document ci-dessous décrit le palier historique.

# Missions — parcours court sur iPhone

Cette étape n'a pas été testée sur iPhone par l'assistant. Le dernier retour humain valide la prairie, les lapins, le zoom, les déplacements, le pincement, Recentrer, la collection de onze espèces, les trois nouveaux communs en boutique, l'absence des rares en boutique, les conditions du carnet et la lisibilité des listes. Les nouvelles reproductions, les dépenses de cœurs et l'export/import restent à vérifier.

## Lancer depuis Windows

Dans le dossier extrait `prairie-lapins-prototype` :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Laisser le terminal ouvert. L'iPhone et le PC doivent être sur le même réseau. Ouvrir dans Safari l'adresse **Network** affichée, suivie de **`?dev=1`**. Vérifier le badge **Mode test · partie séparée**. Ne pas utiliser `localhost` sur l'iPhone.

Le mode test possède une sauvegarde et une horloge séparées. Exporter toute progression de test à conserver avant de redémarrer. Les avances de temps sont dans Paramètres ; elles ne donnent pas de ressources directement.

## Parcours principal — environ 10 minutes

1. **Nouvelle partie de test.** Dans Paramètres, redémarrer avec confirmation uniquement après vérification du badge de mode test. Vérifier 300 pattes, 10 herbes et 12 cœurs. Le bouton Missions apparaît sous les compteurs, sans ouverture automatique. Les huit principales sont visibles ; les quotidiennes affichent 0/100, 0/40 et 0/3, un compte à rebours d'environ 24 h et l'avertissement d'expiration.
2. **Première récompense.** Acheter une ferme (60 pattes). Un indicateur apparaît sur Missions. Principales → Première ferme : condition acquise, gratuit, +20 herbes. Réclamer : les herbes passent de 10 à 30 ; une petite animation confirme. Double pression, fermeture/réouverture et rechargement ne doivent pas redonner les 20 herbes. La quotidienne herbe reste à 0/40.
3. **Récolter l'herbe.** Lancer la commande de 40 herbes pour 18 pattes. Paramètres → +20 min. Tant que la ferme n'est pas récoltée, la mission reste à 0/40. Récolter : progression 40/40. Réclamer les +10 herbes dans Missions ne doit pas faire passer le compteur à 50.
4. **Nourrir.** Nourrir le même lapin trois fois (coûts 2, 4 puis 6 herbes), en espaçant les pressions. Quotidienne : 3/3 ; affection du lapin : 4. Réclamer les +20 pattes. Le compteur de récolte des enclos ne doit pas progresser à cause de cette récompense.
5. **Récolter les pattes.** Paramètres → +360 min. Les enclos stockent suffisamment de pattes, mais la mission reste à zéro avant récolte. Récolter au moins 100 pattes, puis réclamer les +30 pattes. Le panneau conserve la quantité réellement récoltée, éventuellement supérieure à 100.
6. **Bonus.** Après les trois réclamations, le bouton du bonus devient disponible. Réclamer +2 cœurs : solde 14 si aucun autre cœur n'a été gagné ou dépensé. Double pression et rechargement restent à 14. Le cadeau de 2 cœurs du compteur Cœurs est un système séparé, dont l'échéance n'a pas changé.
7. **Condition durable.** Nourrir encore le lapin jusqu'à l'affection 5. La principale Des liens plus forts devient réclamable pour 1 cœur. Déplacer le lapin ne retire pas la condition acquise. Un raccourci de mission doit seulement ouvrir la boutique, la collection ou le bâtiment/la fiche utile, jamais acheter ou nourrir automatiquement.
8. **Renouvellement.** Paramètres → +1440 min : le cycle suivant est actif, quotidiennes à zéro, réclamations et bonus réinitialisés, principales conservées. Le prochain renouvellement reste aligné sur l'heure de création, pas sur l'heure du dernier gain ou de la dernière ouverture. Avancer plusieurs jours : aucune récompense de mission automatique ni cumul des cycles manqués.

Pour vérifier l'expiration, terminer une quotidienne puis avancer de +1440 min **sans réclamer** : elle revient à zéro et son ancienne récompense n'est plus disponible. Faire aussi l'essai avec les trois récompenses réclamées mais le bonus non réclamé : le bonus expire. La frontière exacte à la milliseconde et l'horloge en arrière sont couvertes par les tests automatisés.

## Migration et export/import — essais encore ouverts sur iPhone

- Une partie v2 existante est migrée en v3 sur la même origine. Son solde de cœurs et la prochaine disponibilité du cadeau restent inchangés. Les principales vérifiables sont proposées, jamais encaissées automatiquement ; les quotidiennes commencent à zéro pour 24 h.
- Le fichier facultatif `docs/test-saves/collection-ready-v2.json` permet ce test **uniquement dans la partie de développement** : six principales disponibles, aucune réclamée, affection 2 donc Des liens plus forts encore en cours, et aucun rare découvert. Ses ressources préparées ne sont pas des récoltes de missions. Le solde reste 12 cœurs, pas 24.
- Pour une ancienne v1, la règle historique reste 12 cœurs une fois lors de la migration ; missions quotidiennes nouvelles à zéro. L'import v1/v2 fixe leur référence à la confirmation effective, pas à l'ouverture de l'aperçu.
- Exporter après une réclamation v3 ; vérifier le fichier dans Fichiers/Téléchargements. Recharger puis importer, d'abord en annulant, ensuite en confirmant : la récompense déjà réclamée reste réclamée, sans fusion avec l'autre partie. Une ancienne sauvegarde réimportée restaure volontairement son propre état, comme auparavant.
- Paramètres affiche toute erreur de sauvegarde. En cas d'écriture impossible, la progression en mémoire est exportable ; réessayer l'enregistrement. Ne pas considérer une fermeture du partage iOS comme un export réussi.

Rapporter modèle d'iPhone, iOS et résultat de chaque étape. Vérifier surtout que le bouton Missions, les compteurs, les onglets et les boutons de réclamation restent lisibles en paysage et que le défilement n'entraîne pas la prairie.

Les sauvegardes sont liées au **protocole, domaine et port**. Changer d'origine ou passer au futur site HTTPS nécessite un export/import. Le stockage local n'est pas permanent. Aucun déploiement ni PWA n'est livré ici.
