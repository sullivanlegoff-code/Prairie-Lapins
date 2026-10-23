# Parcours cœurs sur iPhone — à vérifier par l'humain

> Mise à jour étape 7 : le test humain valide désormais perspective, lapins, zoom, déplacements, pincement, Recentrer, collection de onze espèces, boutique et conditions du carnet. Les nouvelles reproductions, dépenses de cœurs et export/import restent ouverts. Les mentions de caméra non validée plus bas décrivent la situation au moment de rédaction de ce parcours. L'export produit maintenant la **v3** ; v1/v2 restent importables par migration. Le nouveau parcours Missions est dans [missions-iphone-test.md](missions-iphone-test.md).

Les scénarios ci-dessous n'ont pas été exécutés sur iPhone par l'assistant. Perspective/caméra de l'étape 4 et export/import iPhone restent non validés. Aucun déploiement HTTPS ni PWA.

## Lancer depuis Windows 11

Dans le projet extrait, avec Node.js 22.12+ ou 24 LTS :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Garder le terminal ouvert. Sur l'iPhone du même réseau, ouvrir dans Safari l'adresse **Network** affichée, en ajoutant **`?dev=1`**. Exemple : `http://192.168.1.20:5173/?dev=1` avec l'IP réellement affichée. Le badge **Mode test · partie séparée** doit être visible. Conserver l'adresse/port utilisés si vous voulez retrouver votre sauvegarde précédente.

Si l'environnement de développement refuse l'inventaire réseau (`uv_interface_addresses`), `--host 127.0.0.1` permet seulement un essai local sur ordinateur ; ce n'est pas l'adresse à ouvrir sur iPhone.

## Parcours court (environ 10 minutes)

1. Sur une nouvelle partie de test, vérifier **12 cœurs**. S'il existe déjà une partie de test, la conserver ou l'exporter ; pour retrouver exactement les valeurs ci-dessous, utiliser le redémarrage confirmé **uniquement après avoir vérifié le badge de mode test**. Le compteur ouvre le panneau Cœurs ; le cadeau est gratuit mais indisponible avant 24 h.
2. Paramètres → **+1440 min**. Compteur Cœurs → **Réclamer** : solde 14 ; une double pression doit rester à 14. Avancer de trois jours (trois fois +1440), réclamer : solde 16, pas 20. Recharger : le solde reste 16 et le prochain cadeau attend 24 h après la dernière réclamation.
3. Boutique → placer une ferme à 60 pattes ; lancer 40 herbes pour 18 pattes. **Terminer · 3 cœurs** : vérifier l'action et le solde dans le dialogue, annuler, vérifier l'absence de débit. Recommencer et confirmer : une seule dépense de 3 (ou moins si suffisamment de temps s'est écoulé), ferme prête mais herbe non récoltée automatiquement. Récolter manuellement.
4. Acheter un nid et une nurserie (100 + 80 pattes), nourrir les deux lapins à l'affection 2. Avec les dépenses précédentes et sans récolter de pattes, le portefeuille est 42 pattes ; une grande commande de ferme à 40 laisse **2 pattes**. Lancer une reproduction : le paiement normal refuse ; **Compléter · 2 pattes + 1 cœur** ouvre une confirmation. Après confirmation : 0 patte, un cœur de moins et reproduction lancée.
5. Accélérer le nid pour au plus 4 cœurs. Vérifier que la croissance commence avec son délai complet, que l'espèce reste cachée et que la production de ferme continue à son heure normale. Accélérer ensuite la croissance (1 cœur pour un commun, 3 pour un hybride, moins si le temps a avancé). Accueillir manuellement : la découverte n'est enregistrée qu'à l'accueil.
6. Avec les pattes restantes insuffisantes, placer un nouveau bâtiment sur une case libre : vérifier le détail du complément, annuler le dialogue puis le placement. Aucun débit. Sur une case occupée/verrouillée, aucune proposition de paiement. Un lapin demandant de l'herbe ne propose jamais de cœurs.
7. Passer Safari en arrière-plan puis revenir et recharger. Vérifier cœurs, autres ressources, lapins et progression des délais. Observer le HUD en paysage : trois compteurs et navigation lisibles, cibles accessibles près des zones sûres. Le cadrage doit être celui de l'étape 4.

Si les actions ont pris assez de temps pour faire évoluer un tarif, vérifier la formule sur le temps réellement restant, pas seulement le montant de cet exemple. Les revenus ne sont pas versés dans le portefeuille sans récolte.

## Cas complémentaires

- Prix en baisse : sur une production moyenne, ouvrir une confirmation puis attendre le passage d'un seuil de 5 minutes avant de confirmer. Le coût effectivement débité diminue ; il ne peut jamais augmenter. Attendre la fin complète dans le dialogue : aucun débit. Ces cas sont déjà couverts par l'horloge injectée des tests automatisés.
- Nurserie occupée : lancer une autre reproduction puis l'accélérer pendant qu'elle tourne. Le dialogue prévient de l'attente au nid. Le résultat doit rester disponible, sans bouton d'accélération une fois le délai terminé. Accueillir le premier occupant libère la nurserie et démarre normalement la croissance suivante.
- Enclos tous pleins : la croissance continue normalement ; aucune proposition de payer pour enlever le manque de place. Après libération d'une place, une croissance encore en cours peut être accélérée.
- Manque de cœurs : bouton de paiement désactivé, motif calme et lisible ; les actions normales restent possibles par attente, récolte et production.
- Migration : une partie v1 existante sur la même origine reçoit 12 cœurs au premier chargement, puis aucune seconde dotation au rechargement. Un import v1 ajoute les cœurs à cette partie importée, sans les cumuler avec la partie remplacée ; prochaine récompense après 24 h.

## Export/import — toujours à vérifier sur iPhone

Suivre aussi `docs/manual-test.md` : exporter vers Fichiers ou Téléchargements Safari, vérifier le fichier, importer et annuler, puis importer et confirmer. Le résumé contient désormais le solde de cœurs. Un export **v2** doit retrouver le même solde sans dotation ; un ancien export **v1** est migré avec 12 cœurs. Ne pas utiliser un export de test pour remplacer involontairement la partie normale.

Conserver un export intact avant les essais de refus. Un mauvais JSON, une version 999 ou un fichier dépassant la limite ne doit pas remplacer la partie. Sur HTTP local, le partage natif peut être absent ; vérifier le téléchargement de secours.

Les sauvegardes sont liées au **protocole, domaine et port**. Passer du serveur Windows au futur site HTTPS nécessite un export/import. La copie locale n'est pas permanente et n'est pas synchronisée entre appareils ou onglets. Rapporter appareil/iOS, résultat par scénario et captures si le HUD déborde ou si une dépense ne correspond pas au devis.
