# Récolte et fiche du lapin

La bulle de monnaie d’un habitat apparaît à partir du seuil de présentation
`INCOME_BUBBLE_THRESHOLD` (200 pattes), ou lorsque le stock est plein, même si
son plafond est inférieur au seuil. Le menu de l’habitat conserve la récolte
manuelle dès une patte.

Le départ guidé de Paille (`onboarding.ts`, `guidance.ts` et missions initiales)
ne dépend pas d’une bulle de revenus d’habitat : la récolte guidée concerne la
nourriture de la ferme et le budget initial permet le parcours sans revenus
d’habitat. Aucune exception de guidage n’est ajoutée. Les tests `start-step4`
et `guidance` couvrent ce parcours, avec les tests DOM de récolte manuelle.

Les noms restent dans les menus mais ne sont plus dessinés sur l’île.
Les constantes `labelY` sont conservées car `recenter.ts` les lit encore
pour calculer le cadrage.

La fiche individuelle affiche « Chance de reproduction » et un indicateur
qualitatif à trois crans. Le palier est dérivé des facteurs et seuils de
`RARE_BIRTH_BONUS`. Il décrit le bonus lié à l’affection du lapin, sans modifier
le calcul réel, qui tient compte des deux parents. L’ancien texte chiffré du
bonus dans cette fiche est remplacé par cet encadré.
