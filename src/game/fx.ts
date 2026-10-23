// Module render-state thuan TS - khong import react
// Chuyen frame + event cua engine thanh du lieu lop render/hieu ung tieu thu an toan.
import { BattleEvent, BattleFrame, FightUnit } from './engine';
import { CHAMPIONS, MONSTERS, ChampDef, MonsterDef } from './data';

export type ArtDef = ChampDef | MonsterDef;

export function resolveArt(artId: string): ArtDef | undefined {
  // Golem trieu hoi: defId 'golem-summon' va artId 'golem' deu tro ve MONSTERS golem
  if (artId === 'golem-summon' || artId === 'golem') return MONSTERS.find(m => m.id === 'golem');
  const champ = CHAMPIONS.find(c => c.id === artId);
  if (champ) return champ;
  return MONSTERS.find(m => m.id === artId);
}

export interface RenderUnit extends FightUnit { art: ArtDef; }

export function renderUnitsForFrame(frame: BattleFrame): RenderUnit[] {
  // Fallback khong bao gio undefined: slime
  const fallback = MONSTERS.find(m => m.id === 'slime') ?? MONSTERS[0];
  const units: RenderUnit[] = frame.units.map(u => ({
    ...u,
    art: resolveArt((u as FightUnit).artId ?? (u as FightUnit).defId) ?? fallback,
  }));
  // Sort theo y tang dan (ve sau = hang truoc)
  units.sort((a, b) => a.y - b.y);
  return units;
}

export function eventsInWindow(events: BattleEvent[], t0: number, t1: number): BattleEvent[] {
  // Tra events co t0 < t <= t1 (voi t0 < 0 lay tu dau), giu thu tu
  return events.filter(e => (t0 < 0 ? e.t <= t1 : (e.t > t0 && e.t <= t1)));
}
