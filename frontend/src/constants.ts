export const FRAGMENTS = [
  { id: 'methyl', smiles: 'C', name: 'Methyl', color: '#6366f1' },
  { id: 'phenyl', smiles: 'c1ccccc1', name: 'Phenyl', color: '#ec4899' },
  { id: 'carboxyl', smiles: 'C(=O)O', name: 'Carboxyl', color: '#f43f5e' },
  { id: 'amino', smiles: 'N', name: 'Amino', color: '#3b82f6' },
  { id: 'hydroxyl', smiles: 'O', name: 'Hydroxyl', color: '#10b981' },
  { id: 'isopropyl', smiles: 'C(C)C', name: 'Isopropyl', color: '#f59e0b' },
  { id: 'chloride', smiles: 'Cl', name: 'Chloride', color: '#64748b' },
  { id: 'terminate', smiles: 'DONE', name: 'Done', color: '#ffffff' },
];

export const PRESETS = [
  { name: 'Methane', smiles: 'C' },
  { name: 'Benzene', smiles: 'c1ccccc1' },
  { name: 'Ethanol', smiles: 'CCO' },
  { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
];

export interface MoleculeMetrics {
  qed: number;
  sas: number;
  mw: number;
  logp: number;
}

export const QED_STRUCTURAL_ALERTS = [
  "*1[O,S,N]*1", "[S,C](=[O,S])[F,Br,Cl,I]", "[CX4][Cl,Br,I]", "[#6]S(=O)(=O)O[#6]",
  "[$([CH]),$(CC)]#CC(=O)[#6]", "[$([CH]),$(CC)]#CC(=O)O[#6]", "n[OH]",
  "[$([CH]),$(CC)]#CS(=O)(=O)[#6]", "C=C(C=O)C=O", "n1c([F,Cl,Br,I])cccc1",
  "[CH2]=[CH][CH2][Cl,Br,I]", "[#6]=[#6][#6]=[O,S]", "[#6]=[#6][S,C]=O",
  "[#6]=[#6]C#N", "[#6]=[#6]C(=O)O[#6]", "[#6]=[#6]S(=O)(=O)[#6]",
  "[#6]=[#6]P(=O)", "[#6]=[#6][#6]=[#6][#6]=O", "[#6]=[#6][#6]=C([#6])[#6]=O",
  "[#6]=C([#6])C=O", "[#16!s][#16!s]", "[#6!c]=[S,s,O,o]", "[#6!c]=[N,n]",
  "c1c([F,Cl,Br,I])c([F,Cl,Br,I])c1", "c1c([F,Cl,Br,I])cc([F,Cl,Br,I])c1",
  "c1c([F,Cl,Br,I])ccc([F,Cl,Br,I])1", "c1cc([F,Cl,Br,I])cc([F,Cl,Br,I])1",
  "[#6]S(=O)(=O)C=C", "C1(=O)C=CC(=O)C=C1", "C1(=O)C(=O)C=CC=C1",
  "C1(=O)C=CC(=O)C2=C1C=CC=C2", "C1(=O)C(=O)C2=C(C=CC=C2)C=C1",
  "[#15!P]=[O,S]", "[#16!S]=[O,S]", "[#7!n!N!H0!H1!H2]", "[#7!n!N!H1!H2!H3]",
  "[#8!o!O!H0!H1]", "[#8!o!O!H1!H2]", "[#16!s!S!H0!H1]", "[#16!s!S!H1!H2]",
  "[#7!n]C(=O)C#N", "[#7!n]C(=O)C=C", "[#7!n]S(=O)(=O)C=C", "[#7!n]C(=O)C=C",
  "[#16!s]C(=O)C#N", "[#16!s]C(=O)C=C", "[#16!s]S(=O)(=O)C=C", "[#16!s]C(=O)C=C",
  "[#8!o]C(=O)C#N", "[#8!o]C(=O)C=C", "[#8!o]S(=O)(=O)C=C", "[#8!o]C(=O)C=C",
  "C#CC(=O)", "C1OC1", "C1NC1", "C1SC1", "[#6]S(=O)(=O)F", "[#6]S(=O)(=O)Cl",
  "[#6]S(=O)(=O)Br", "[#6]S(=O)(=O)I"
];
