# Passation du 6 novembre 2026 : à un agent Claude sur un autre compte

Le propriétaire n'a plus de jetons sur son compte et continue avec toi. Il n'est pas développeur : parle-lui en français, tutoie-le, avec des phrases simples.

## À lire d'abord, dans cet ordre

1. `AGENTS.md` : les règles permanentes. Elles restent valables, sauf les exceptions ci-dessous.
2. Ce fichier.
3. `docs/passation-2026-11-04-noel.md` : le détail de la mise à jour de Noël.

**Ce qui remplace `AGENTS.md` :**
- **Qui code :** toi, seul ou avec des agents Claude. Mots du propriétaire : « codex ne doit pas te servir à coder tu peux le faire toi même . Uniquement pour les visuels. »
- **Format de sauvegarde :** v27, pas v24.
- **Publication :** tout partira en une seule grande mise à jour de Noël. Rien sur `main` ni sur GitHub tant qu'il ne le demande pas : un envoi sur `main` publie le jeu pour tous les joueurs.

La mémoire de l'ancien compte se trouve dans le dossier du projet sous `~/.claude/projects/` (dossier de configuration de l'ancien compte). Elle n'est peut-être pas visible depuis le tien. L'essentiel est repris ici.

## État actuel

- **Branche :** `feature/noel`. Lance `git log -5` pour voir le dernier commit (cette passation y est ajoutée juste après `cfaafe5`).
- **`main` :** rien de Noël n'est fusionné ni publié. `feature/noel` n'est pas sur GitHub : le travail n'existe que sur ce PC.
- **Fichiers non suivis du propriétaire, à ne jamais committer ni envoyer nulle part :**
  - `.claude/`, `output/`, `.env.local` ;
  - `assets-source/Benny/` (photos de sa vraie lapine), `assets-source/Bontons/` ;
  - `assets-source/rabbits/Arkoko/` (ses dessins et inspirations) ;
  - les dossiers « évolution … » de Dadi, Dinenette et Dinono ;
  - `assets-source/rabbits/Tous les lapins et les descriptions.xlsx`.

## Ce qui vient d'être fait (6 novembre)

- **Audit de Noël corrigé** (`ddbdbea`). Trois petits points restent connus et non corrigés : l'affection de la cuisine se rouvre en relâchant le lapin, une nurserie garde ses 3e et 4e coussins occupés, les cadeaux du ciel bougent encore par `left` et `top`.
- **Nouveaux lapins et évolutions** validés par le propriétaire et intégrés (`a5ffbd7`). Les 48 espèces qui peuvent évoluer ont leur dessin, leurs défis et leurs repères de cuisine. Benny n'a pas d'évolution, par décision du propriétaire.
- **Le vol de Benny** : battement d'ailes fluide (`4626209`). Seul l'affichage change, pas les règles.
- **Apparition de Benny** : refaite avec ses poses peintes existantes (`b0a2084`, `cfaafe5`).
- **Tests** : de 3 368 à 2 061 (`68d618a`), surtout par regroupement avec `itAll` de `tests/cases.ts`. Deux fichiers en double sont retirés.

## Dernière validation réellement faite

- **Suite complète :** 2 060 sur 2 061, avant la toute dernière correction de style. L'échec est `tests/rabbit-blink-art.test.js`, un dépassement de temps pendant que des builds tournaient en même temps. Seul, il passe en 18 s.
- **Après la correction :** `npx tsc --noEmit` est bon et 4 fichiers de tests liés passent (75 sur 75). `npm run build:netlify` a été relancé.
- **Chromium, sur le site construit :**
  - vraie naissance de Benny depuis la nurserie, puis « Accueillir » ;
  - partie de vol avec de vrais touchers ;
  - fin de l'apparition en 844×390 et 667×375.
- **Pas fait :** aucun essai sur iPhone de ces changements. C'est au propriétaire de le faire.

## Prochaine étape

**Fait le 6 novembre :** le propriétaire a essayé sur iPhone le vol et l'apparition de Benny et a tout accepté (« Ok j'accepte tout »). Ces deux parties sont validées ; n'y retouche pas sans qu'il le demande.

- **Serveur iPhone** : `node node_modules/vite/bin/vite.js preview --outDir netlify-site --port 5174 --strictPort --host 0.0.0.0 --configLoader runner`. Celui de l'ancienne session peut s'arrêter avec elle.
- **Adresse** : `http://10.59.135.114:5174/` lors du dernier contrôle. Vérifie-la avec `ipconfig`, elle peut changer.
- **Revoir l'apparition** : fiche de Benny, « Revoir l'apparition », ou bouton « Apparition de Benny » du laboratoire (`/dev/`).

**Réponses du propriétaire (6 novembre) :**
- le nom « Broussailles » pour les débris : gardé ;
- le dessin de base de Pain d'épice, de pur profil : gardé tel quel ;
- la toque de cuisine : elle reste par-dessus le chapeau des lapins qui en ont un.

**Mis de côté par le propriétaire, à ne pas lancer ni reproposer :** le clignement et la truffe sur les évolutions (« On ne fait pas encore le clignement et la truffe pour les évolutions. »).

## Règles du propriétaire à garder en tête

- **Avancer sans question** : décide toi-même et signale tes choix dans le rapport. Ne demande que ce qui lui appartient vraiment (choix d'une image, nouvelle règle de jeu).
- **Textes** : tutoiement partout, « nourriture » et jamais « herbe ». Ne touche pas aux dialogues de Paille (`src/ui/PailleDialogue.ts`) ni à `src/config/loadingMessages.ts`.
- **Dessins** : uniquement peints, jamais procéduraux. Pour un nouveau visuel : 2 ou 3 concepts sur une planche dans `output/`, puis il choisit. Vérifie toujours en capture réelle.
- **Pose des lapins** : debout comme Paille ou sur quatre pattes comme Neige, toujours de trois-quarts, « plus lapin, pas chien ».
- **Évolutions** : le même lapin en adulte, avec une tête vraiment changée et une vraie croissance. Jamais montrées avant la première évolution de l'espèce.
- **Benny** : elle est « elle ». Pas d'ailes dans son apparition. Ne choisis pas à la place du propriétaire. N'invente pas de règles sur les Épiques, Légendaires ou le Mythique.
- **Dépôt public** : ni secret, ni chemin personnel, ni asset non approuvé. Interdits : `git add -A`, `git add .`, `reset --hard`, `clean`, réécriture d'historique. N'annonce jamais un contrôle que tu n'as pas fait : Chromium n'est pas un iPhone.

## Commandes utiles

- **Tests** (environ 10 minutes, à lancer en arrière-plan, sans autre travail lourd en même temps) :
  `npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000 --exclude ".claude/**" --exclude "node_modules/**"`
  L'exclusion de `.claude/**` est nécessaire : d'anciens arbres de travail s'y trouvent.
- **Autres contrôles** : `npx tsc --noEmit`, `git diff --check`, `node docs/progression-simulation.mjs` après tout changement d'économie ou d'XP.
- **Site pour l'iPhone** : `npm run build:netlify` (construit `netlify-site/`).
- **Chromium** : `PLAYWRIGHT_MODULE` doit pointer vers `../Project-L/prairie-lapins-prototype/node_modules/playwright`, en chemin absolu.

## Pièges connus

- **Fins de ligne** : les fichiers mélangent CRLF et LF. Fais des remplacements exacts qui respectent la fin de ligne du fichier. `jump-rope.css` et `sky-gifts.css` restent en LF.
- **Sauvegardes d'essai** : le jeu les valide strictement. Fabrique-les avec un test temporaire dans `tests/.tmp/` (`decodeGame`, modification, `encodeGame`), à supprimer ensuite. Une naissance a besoin d'un identifiant `birth-<nextId>`. Un lapin évolué a besoin de `evolution: {done: true, challenges: …}` et de son espèce dans `discovered`. Clé de stockage : `prairie-lapins.save.v1`.
- **`itAll`** : ne l'utilise pas si les cas ont besoin d'un `beforeEach` entre eux. Garde alors `it.each`.
- **Codex (visuels seulement)** : `codex exec -m gpt-6-luna -c model_reasoning_effort=low --skip-git-repo-check --sandbox workspace-write -C . -i <image> < prompt`. Le prompt doit dire de s'arrêter juste après la génération et de ne pas copier l'image, sinon Codex perd une demi-heure. L'image se récupère dans `~/.codex/generated_images/<session>/`.
