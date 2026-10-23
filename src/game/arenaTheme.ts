// Chon tranh san dau theo ngu canh tran dau (thuan TypeScript, khong phu thuoc React).
// Quy tac chot (xem them muc "San dau theo ngu canh" trong README):
// - Gap Boss (moi che do) -> 'arena-sunset'.
// - Campaign: xoay vong theo chuong: (chapter-1)%3 -> 0 rung 'arena', 1 'arena-desert', 2 'arena-ice'.
// - AI / Song Quai: theo stage: 1 'arena', 2 'arena-sunset', 3 'arena-desert', >=4 'arena-ice'.
export type SceneId = 'arena' | 'arena-desert' | 'arena-ice' | 'arena-sunset';

export interface ArenaContext {
  mode: 'ai' | 'campaign' | 'waves';
  stage: number;
  chapter?: number;
  isBoss: boolean;
}

export function arenaForContext(ctx: ArenaContext): SceneId {
  if (ctx.isBoss) return 'arena-sunset';
  if (ctx.mode === 'campaign') {
    const c = (((ctx.chapter ?? 1) - 1) % 3 + 3) % 3;
    return c === 0 ? 'arena' : c === 1 ? 'arena-desert' : 'arena-ice';
  }
  // ai / waves: theo stage cua tran
  if (ctx.stage <= 1) return 'arena';
  if (ctx.stage === 2) return 'arena-sunset';
  if (ctx.stage === 3) return 'arena-desert';
  return 'arena-ice';
}
