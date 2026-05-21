// Matières IB organisées par groupe
export const GROUPES_MATIERES = {
  'Groupe 1 — Langue et littérature': [
    'Français A — Langue et littérature',
    'Anglais A — Langue et littérature',
  ],
  'Groupe 2 — Acquisition de langues': [
    'Français B',
    'Anglais B',
    'Espagnol B',
  ],
  'Groupe 3 — Individus et sociétés': [
    'Économie',
    'Histoire',
    'Psychologie',
    'Géographie',
    'Politique mondiale',
  ],
  'Groupe 4 — Sciences': [
    'Biologie',
    'Chimie',
    'Physique',
    'Informatique',
    'Sciences de l\'environnement',
  ],
  'Groupe 5 — Mathématiques': [
    'Mathématiques : Analyse et approches',
    'Mathématiques : Applications et interprétation',
  ],
  'Groupe 6 — Arts': [
    'Arts visuels',
    'Musique',
    'Théâtre',
    'Danse',
  ],
}

// Liste plate de toutes les matières
export const TOUTES_MATIERES = Object.values(GROUPES_MATIERES).flat()

// Trouver le groupe d'une matière
export function getGroupeMatiere(matiere) {
  for (const [groupe, matieres] of Object.entries(GROUPES_MATIERES)) {
    if (matieres.includes(matiere)) return groupe
  }
  return 'Autre'
}

// Périodes selon la promotion
export const PERIODES_D1 = [
  { id: 'T1', label: '1er Trimestre' },
  { id: 'T2', label: '2ème Trimestre' },
  { id: 'T3', label: '3ème Trimestre' },
]

export const PERIODES_D2 = [
  { id: 'S1', label: '1er Semestre' },
  { id: 'S2', label: '2ème Semestre' },
]

export function getPeriodes(annee_pd) {
  return annee_pd === 'D1' ? PERIODES_D1 : PERIODES_D2
}

// Couleurs par groupe
export const COULEURS_GROUPES = {
  'Groupe 1 — Langue et littérature': '#1a3a5c',
  'Groupe 2 — Acquisition de langues': '#2a5280',
  'Groupe 3 — Individus et sociétés': '#1a6b4a',
  'Groupe 4 — Sciences': '#7a3e1a',
  'Groupe 5 — Mathématiques': '#5a2d82',
  'Groupe 6 — Arts': '#b85c00',
}
