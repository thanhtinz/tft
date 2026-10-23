// He thong RIG kieu Spine tu xay bang code (Spine-like skeletal rig):
// Moi nhan vat = cac bo phan ve rieng gan vao XUONG (bones) co pivot + z-order.
// Animation clips dang keyframe (vi tri / xoay / scale theo thoi gian + easing),
// noi suy muot giua cac keyframe. File thuan TS, test headless duoc.
export type BoneName = 'root'|'hips'|'torso'|'head'|'eyes'|'armL'|'armR'|'legL'|'legR'|'accessory'|'weaponFx';
export interface BoneDef { name: BoneName; pivotX: number; pivotY: number; z: number; part: string; }
export const BONES: BoneDef[] = [
  { name:'root', pivotX:60, pivotY:104, z:0, part:'shadow+bob goc' },
  { name:'accessory', pivotX:60, pivotY:60, z:1, part:'canh / duoi / ao choang (sau lung)' },
  { name:'legL', pivotX:52, pivotY:94, z:2, part:'chan trai + giay' },
  { name:'legR', pivotX:68, pivotY:94, z:2, part:'chan phai + giay' },
  { name:'hips', pivotX:60, pivotY:86, z:3, part:'hong / vay' },
  { name:'torso', pivotX:60, pivotY:72, z:4, part:'than + trang phuc' },
  { name:'armL', pivotX:38, pivotY:78, z:5, part:'tay trai' },
  { name:'armR', pivotX:82, pivotY:78, z:6, part:'tay phai + vu khi' },
  { name:'head', pivotX:60, pivotY:62, z:7, part:'dau + toc + mat + bieu cam' },
  { name:'eyes', pivotX:60, pivotY:48, z:8, part:'mat (chop mat bang scaleY)' },
  { name:'weaponFx', pivotX:92, pivotY:70, z:9, part:'hieu ung vu khi / anh sang ky nang' },
];
export type ClipName = 'idle'|'walk'|'attack'|'cast'|'hurt'|'death'|'victory';
export interface Key { t: number; x?: number; y?: number; rot?: number; s?: number; sy?: number; o?: number; }
export type Clip = Partial<Record<BoneName, Key[]>> & { duration: number; loop: boolean };
export const CLIPS: Record<ClipName, Clip> = {
  idle: { duration: 1600, loop: true,
    root:[{t:0,y:0,s:1},{t:0.5,y:-2.2,s:1.015},{t:1,y:0,s:1}], torso:[{t:0,rot:0},{t:0.5,rot:1.6},{t:1,rot:0}],
    head:[{t:0,rot:0,y:0},{t:0.5,rot:-2,y:0.8},{t:1,rot:0,y:0}], armL:[{t:0,rot:4},{t:0.5,rot:-3},{t:1,rot:4}], armR:[{t:0,rot:-4},{t:0.5,rot:3},{t:1,rot:-4}],
    accessory:[{t:0,rot:-3,y:0},{t:0.5,rot:3,y:-1.5},{t:1,rot:-3,y:0}], eyes:[{t:0,sy:1},{t:0.06,sy:1},{t:0.09,sy:0.08},{t:0.13,sy:1},{t:1,sy:1}] },
  walk: { duration: 560, loop: true,
    root:[{t:0,y:0},{t:0.25,y:-3.4},{t:0.5,y:0},{t:0.75,y:-3.4},{t:1,y:0}], legL:[{t:0,rot:20},{t:0.5,rot:-20},{t:1,rot:20}], legR:[{t:0,rot:-20},{t:0.5,rot:20},{t:1,rot:-20}],
    armL:[{t:0,rot:-16},{t:0.5,rot:16},{t:1,rot:-16}], armR:[{t:0,rot:16},{t:0.5,rot:-16},{t:1,rot:16}], head:[{t:0,y:0},{t:0.5,y:1.2},{t:1,y:0}], torso:[{t:0,rot:-2},{t:0.5,rot:2},{t:1,rot:-2}] },
  attack: { duration: 460, loop: true,
    root:[{t:0,x:0},{t:0.35,x:3},{t:0.55,x:-1},{t:1,x:0}], armR:[{t:0,rot:-14},{t:0.3,rot:-64},{t:0.5,rot:38},{t:1,rot:-8}], torso:[{t:0,rot:0},{t:0.35,rot:-7},{t:0.55,rot:5},{t:1,rot:0}],
    weaponFx:[{t:0,o:0,s:0.6},{t:0.4,o:0},{t:0.55,o:1,s:1.15},{t:0.8,o:0},{t:1,o:0}], head:[{t:0,rot:0},{t:0.5,rot:3},{t:1,rot:0}] },
  cast: { duration: 900, loop: true,
    root:[{t:0,y:0,s:1},{t:0.4,y:-3,s:1.03},{t:1,y:0,s:1}], armR:[{t:0,rot:0},{t:0.4,rot:-96},{t:0.75,rot:-96},{t:1,rot:0}], armL:[{t:0,rot:0},{t:0.4,rot:52},{t:1,rot:0}],
    head:[{t:0,rot:0,y:0},{t:0.4,rot:-4,y:-1.5},{t:1,rot:0,y:0}], weaponFx:[{t:0,o:0,s:0.5},{t:0.4,o:1,s:1.3},{t:0.75,o:1,s:1.45},{t:1,o:0,s:0.7}], accessory:[{t:0,rot:0},{t:0.5,rot:6},{t:1,rot:0}] },
  hurt: { duration: 380, loop: true,
    root:[{t:0,x:0},{t:0.25,x:-6},{t:0.5,x:3},{t:1,x:0}], head:[{t:0,rot:0},{t:0.25,rot:-7},{t:1,rot:0}], torso:[{t:0,rot:0},{t:0.25,rot:-6},{t:1,rot:0}], eyes:[{t:0,sy:1},{t:0.3,sy:0.15},{t:1,sy:1}] },
  death: { duration: 700, loop: false,
    root:[{t:0,y:0,rot:0,o:1},{t:0.6,y:7,rot:-72,o:0.85},{t:1,y:9,rot:-84,o:0}], head:[{t:0,rot:0},{t:1,rot:-16}], eyes:[{t:0,sy:1},{t:0.4,sy:0.08},{t:1,sy:0.08}] },
  victory: { duration: 720, loop: true,
    root:[{t:0,y:0,s:1},{t:0.3,y:-11,s:1.04},{t:0.55,y:0,s:0.97},{t:0.75,y:-7},{t:1,y:0,s:1}], armL:[{t:0,rot:0},{t:0.35,rot:118},{t:1,rot:118}], armR:[{t:0,rot:0},{t:0.35,rot:-118},{t:1,rot:-118}], head:[{t:0,y:0},{t:0.3,y:-2},{t:1,y:0}] },
};
export interface BoneTransform { x: number; y: number; rot: number; s: number; sy: number; o: number; }
const identity = (): BoneTransform => ({ x:0, y:0, rot:0, s:1, sy:1, o:1 });
export const easeInOut = (t: number) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
function sample(keys: Key[], phase: number): BoneTransform {
  const out = identity(); if (!keys.length) return out;
  let a = keys[0], b = keys[keys.length-1];
  for (let i=0;i<keys.length-1;i++) { if (phase >= keys[i].t && phase <= keys[i+1].t) { a = keys[i]; b = keys[i+1]; break; } }
  if (phase <= keys[0].t) { a = keys[0]; b = keys[0]; }
  const span = Math.max(0.0001, b.t - a.t); const local = easeInOut(Math.max(0, Math.min(1, (phase - a.t)/span)));
  const mix = (ka?: number, kb?: number, def = 0) => (ka ?? def) + ((kb ?? ka ?? def) - (ka ?? def)) * local;
  out.x = mix(a.x, b.x); out.y = mix(a.y, b.y); out.rot = mix(a.rot, b.rot); out.o = mix(a.o, b.o, 1);
  out.s = mix(a.s, b.s, 1); out.sy = mix(a.sy, b.sy, 1);
  return out;
}
// Tra ve transform cua moi xuong tai thoi diem timeMs theo clip dang chay.
export function getBoneTransforms(clipName: ClipName, timeMs: number): Record<BoneName, BoneTransform> {
  const clip = CLIPS[clipName]; const names = BONES.map(b => b.name);
  let phase: number;
  if (clip.loop) phase = (timeMs % clip.duration) / clip.duration; else phase = Math.min(1, timeMs / clip.duration);
  const out = {} as Record<BoneName, BoneTransform>;
  for (const n of names) { out[n] = clip[n] ? sample(clip[n]!, phase) : identity(); }
  // Xuyen suot: root dieu khien bob/squash, cac xuong khac cong don theo
  return out;
}
export function svgTransform(tr: BoneTransform, pivotX: number, pivotY: number): string {
  return `translate(${tr.x + pivotX*(1-tr.s)} ${tr.y + pivotY*(1-(tr.sy ?? tr.s))}) rotate(${tr.rot} ${pivotX} ${pivotY}) scale(${tr.s} ${tr.sy})`;
}
// Trang thai tran dau -> clip: noi that vao battle engine (frame + event)
export type UnitAnimState = ClipName;
export function stateForUnit(opts: { alive: boolean; moved: boolean; castAtFrame: boolean; attackedAtFrame: boolean; hurtAtFrame: boolean; battleOver: boolean; won?: boolean }): UnitAnimState {
  if (!opts.alive) return 'death';
  if (opts.battleOver && opts.won) return 'victory';
  if (opts.castAtFrame) return 'cast';
  if (opts.hurtAtFrame) return 'hurt';
  if (opts.attackedAtFrame) return 'attack';
  if (opts.moved) return 'walk';
  return 'idle';
}
// 2.5D: scale va do sau theo hang (hang truoc lon hon, ve sau de che hang sau)
export function rowDepth(y: number, rows: number) { const f = rows <= 1 ? 1 : y/(rows-1); return { scale: 0.78 + f*0.42, zIndex: 10 + y*10, shadowScale: 0.8 + f*0.4 }; }
export function rowOffsets(rows: number, baseCell: number): number[] { const offs: number[] = []; let acc = 0; for (let y=0;y<rows;y++){ offs.push(acc); acc += baseCell * (0.78 + (rows<=1?1:y/(rows-1))*0.42); } return offs; }
