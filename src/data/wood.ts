import type { WoodCatalogItem, WoodFinish } from '@/domain/types';

export const WOODS: WoodCatalogItem[] = [
  { id: "soglia-in-legno-lamellare-spessore-10-cm", nome: "SOGLIA IN LEGNO LAMELLARE SPESSORE 10 CM.", prezzoCm: 1.1 },
  { id: "soglia-in-legno-lamellare-spessore-12-cm", nome: "SOGLIA IN LEGNO LAMELLARE SPESSORE 12 CM.", prezzoCm: 1.1 },
  { id: "soglia-in-legno-castagno-spessore-10-cm", nome: "SOGLIA IN LEGNO CASTAGNO SPESSORE 10 CM.", prezzoCm: 1.3 },
  { id: "soglia-in-legno-castagno-spessore-12-cm", nome: "SOGLIA IN LEGNO CASTAGNO SPESSORE 12 CM.", prezzoCm: 1.3 },
  { id: "soglia-in-legno-lamellare-spessore-16-cm", nome: "SOGLIA IN LEGNO LAMELLARE SPESSORE 16 CM.", prezzoCm: 1.3 },
  { id: "soglia-in-legno-castagno-spessore-16-cm", nome: "SOGLIA IN LEGNO CASTAGNO SPESSORE 16 CM.", prezzoCm: 1.5 },
];

export const WOOD_FINISHES: WoodFinish[] = [
  { id: "normale", nome: "NORMALE", variazione: 0 },
  { id: "spazzolato", nome: "SPAZZOLATO", variazione: 0.05 },
  { id: "anticatura-bordi", nome: "ANTICATURA BORDI", variazione: 0.05 },
  { id: "anticato-spazzolato", nome: "ANTICATO + SPAZZOLATO", variazione: 0.1 },
];
