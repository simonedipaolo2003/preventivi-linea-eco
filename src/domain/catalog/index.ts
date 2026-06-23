// ============================================================================
// Catalog access layer — isolates master data lookups from the engine/UI.
// ============================================================================
import { MATERIALS, FASCIA_PREZZO } from '@/data/materials';
import { WOODS, WOOD_FINISHES } from '@/data/wood';
import { SPECIAL_WORKS, SPECIAL_SUPPLEMENTS } from '@/data/labor';
import type {
  Fascia,
  LaborCatalogItem,
  MaterialCatalogItem,
  SpecialSupplementDef,
  WoodCatalogItem,
  WoodFinish,
} from '@/domain/types';

export function getMaterial(id?: string): MaterialCatalogItem | undefined {
  return id ? MATERIALS.find((m) => m.id === id) : undefined;
}

/** Prezzo €/mq derivato dalla fascia del materiale (replica VLOOKUP fascia→prezzo). */
export function prezzoPerFascia(fascia: Fascia): number {
  return FASCIA_PREZZO[String(fascia)] ?? 0;
}

export function getWood(id?: string): WoodCatalogItem | undefined {
  return id ? WOODS.find((w) => w.id === id) : undefined;
}

export function getWoodFinish(id?: string): WoodFinish | undefined {
  return id ? WOOD_FINISHES.find((f) => f.id === id) : undefined;
}

export function getSpecialWork(id?: string): LaborCatalogItem | undefined {
  return id ? SPECIAL_WORKS.find((l) => l.id === id) : undefined;
}

export function getSpecialSupplement(id?: string): SpecialSupplementDef | undefined {
  return id ? SPECIAL_SUPPLEMENTS.find((s) => s.id === id) : undefined;
}

export { MATERIALS, WOODS, WOOD_FINISHES, SPECIAL_WORKS, SPECIAL_SUPPLEMENTS, FASCIA_PREZZO };
export { MATERIAL_FAMILIES } from '@/data/materials';
