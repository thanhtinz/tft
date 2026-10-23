// Test he thong tai khoan LOCAL + XP/LP/HANG (auth.ts thuan TS, compile ra .build-auth).
import { sha256Hex, hashPassword, registerAccount, verifyLogin, changePasswordLocal, generateTag, applyXp, xpToNextLevel, applyLp, lpDelta, lpProgress, rankLabel, recordArenaStats, avgPlacement, emptyStats, defaultRank } from './.build-auth/auth.js';
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name); } };
// RNG xac dinh de test on dinh
function lcg(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }

console.log('== SHA-256 ==');
ok(sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256("abc") dung vector chuan');
ok(sha256Hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256("") dung vector chuan');
ok(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq') === '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1', 'sha256 chuoi 56 byte (edge padding) dung');
ok(sha256Hex('Mật khẩu tiếng Việt') !== sha256Hex('Mat khau tieng Viet'), 'sha256 phan biet chuoi UTF-8');

console.log('== Bam mat khau ==');
const h1 = hashPassword('matkhau123', 'salt-a');
ok(h1 === hashPassword('matkhau123', 'salt-a'), 'cung salt + mat khau -> cung hash');
ok(h1 !== hashPassword('matkhau123', 'salt-b'), 'khac salt -> khac hash');
ok(h1 !== 'matkhau123' && h1.length === 64, 'hash la hex 64 ky tu, khong chua mat khau tho');

console.log('== Dang ky / dang nhap LOCAL ==');
const rng = lcg(42);
const accounts = [];
const r1 = registerAccount(accounts, { email: 'Tin@Example.com', password: 'secret1', displayName: 'TinPro' }, rng);
ok(!!r1.account, 'dang ky thanh cong');
accounts.push(r1.account);
ok(/^[0-9]{4}$/.test(r1.account.tag), 'tag tu sinh dang #4 so: #' + r1.account.tag);
ok(r1.account.email === 'tin@example.com', 'email chuan hoa chu thuong');
const dup = registerAccount(accounts, { email: 'tin@example.com', password: 'secret2', displayName: 'Nguoi Khac' }, rng);
ok(dup.error === 'EMAIL_TAKEN', 'trung email bi chan');
ok(registerAccount(accounts, { email: 'khong-phai-email', password: 'secret1', displayName: 'Ab' }, rng).error === 'EMAIL_INVALID', 'email sai dinh dang bi chan');
ok(registerAccount(accounts, { email: 'a@b.co', password: '12345', displayName: 'Ab' }, rng).error === 'PASSWORD_SHORT', 'mat khau ngan bi chan');
ok(registerAccount(accounts, { email: 'a@b.co', password: '123456', displayName: 'A' }, rng).error === 'NAME_INVALID', 'ten qua ngan bi chan');
const loginOk = verifyLogin(accounts, 'TIN@example.com', 'secret1');
ok(!!loginOk.account && loginOk.account.id === r1.account.id, 'dang nhap dung email + mat khau');
ok(verifyLogin(accounts, 'tin@example.com', 'sai-mat-khau').error === 'WRONG_PASSWORD', 'sai mat khau bi bao WRONG_PASSWORD');
ok(verifyLogin(accounts, 'chua@co.com', 'secret1').error === 'EMAIL_NOT_FOUND', 'email chua dang ky bao EMAIL_NOT_FOUND');
// Tag duy nhat tuong doi cho cung ten hien thi
const rng2 = lcg(7);
const sameName = [];
for (let i = 0; i < 30; i++) { const rr = registerAccount(sameName, { email: 'u' + i + '@x.co', password: 'secret1', displayName: 'Trung Ten' }, rng2); if (rr.account) sameName.push(rr.account); }
const pairs = new Set(sameName.map(a => a.displayName.toLowerCase() + '#' + a.tag));
ok(pairs.size === sameName.length && sameName.length === 30, '30 tai khoan trung ten -> 30 cap (ten#tag) khac nhau');
ok(/^[0-9]{4}$/.test(generateTag([], 'X', rng2)), 'generateTag luon tra 4 chu so');

console.log('== Doi mat khau LOCAL ==');
const cpWrong = changePasswordLocal(r1.account, 'sai', 'newpass1', rng);
ok(cpWrong.error === 'WRONG_PASSWORD', 'doi mat khau: mat khau cu sai bi chan');
const cp = changePasswordLocal(r1.account, 'secret1', 'newpass1', rng);
ok(!!cp.account && verifyLogin([cp.account], 'tin@example.com', 'newpass1').account != null, 'doi mat khau xong dang nhap bang mat khau moi duoc');
ok(verifyLogin([cp.account], 'tin@example.com', 'secret1').error === 'WRONG_PASSWORD', 'mat khau cu khong con dung duoc');

console.log('== XP / Cap do ==');
ok(xpToNextLevel(1) === 80, 'XP len cap 2 = 80');
const x1 = applyXp(1, 0, 50); ok(x1.level === 1 && x1.xp === 50, 'cong 50 XP chua len cap');
const x2 = applyXp(1, 79, 1); ok(x2.level === 2 && x2.xp === 0 && x2.levelsGained === 1, 'du 80 XP len cap 2');
const x3 = applyXp(1, 0, 80 + 120 + 30); ok(x3.level === 3 && x3.xp === 30, 'cong nhieu XP len nhieu cap 1 luc');

console.log('== LP / HANG ==');
ok(lpDelta(1, 0) === 46 && lpDelta(8, 0) === -34, 'bang LP Sat: top1 +46, hang 8 -34');
ok(lpDelta(1, 6) === 38 && lpDelta(8, 9) === -45, 'bang LP Kim Cuong+: top1 +38, hang 8 -45');
ok(lpDelta(4, 3) === 11 && lpDelta(5, 3) === -6, 'bang LP Vang: top4 +11, hang 5 -6');
const d0 = defaultRank(); ok(d0.tier === 0 && d0.division === 4 && d0.lp === 0, 'hang mac dinh Sat IV 0 LP');
const w1 = applyLp(d0, 1); ok(w1.delta === 46 && w1.rank.lp === 46 && !w1.promoted, 'thang tran dau: +46 LP, chua thang hang');
const promo = applyLp({ tier: 0, division: 4, lp: 90 }, 1); ok(promo.promoted && promo.rank.division === 3 && promo.rank.lp === 36, '90+46=136 -> len Sat III con 36 LP');
const promoTier = applyLp({ tier: 0, division: 1, lp: 95 }, 1); ok(promoTier.rank.tier === 1 && promoTier.rank.division === 4 && promoTier.rank.lp === 41, 'Sat I du 100 -> len Dong IV');
const demo = applyLp({ tier: 3, division: 2, lp: 5 }, 8); ok(demo.demoted && demo.rank.division === 3 && demo.rank.lp === 42, 'Vang II 5 LP thua -38 -> giang Vang III 42 LP');
const floor = applyLp({ tier: 0, division: 4, lp: 10 }, 8); ok(floor.rank.lp === 0 && floor.rank.tier === 0 && floor.rank.division === 4, 'san Sat IV: LP khong am');
const toApex = applyLp({ tier: 6, division: 1, lp: 90 }, 1); ok(toApex.rank.tier === 7 && toApex.rank.division === null && toApex.rank.lp === 28, 'Kim Cuong I du 100 -> Cao Thu 28 LP');
const apexPromo = applyLp({ tier: 7, division: null, lp: 190 }, 1); ok(apexPromo.rank.tier === 8 && apexPromo.rank.lp === 28, 'Cao Thu 190+38 -> Dai Cao Thu (moc 200)');
const apexDemo = applyLp({ tier: 7, division: null, lp: 5 }, 8); ok(apexDemo.demoted && apexDemo.rank.tier === 6 && apexDemo.rank.division === 1 && apexDemo.rank.lp === 35, 'Cao Thu am LP -> xuong Kim Cuong I 35 LP');
ok(rankLabel({ tier: 0, division: 4, lp: 0 }) === 'Sắt IV • 0 LP', 'nhan hang Sat IV dung dinh dang');
ok(rankLabel({ tier: 9, division: null, lp: 250 }) === 'Thách Đấu • 250 LP', 'nhan hang Thach Dau dung dinh dang');
ok(lpProgress({ tier: 2, division: 3, lp: 50 }) === 0.5, 'tien trinh LP 50%');

console.log('== Thong ke ==');
let st = emptyStats();
st = recordArenaStats(st, 1); st = recordArenaStats(st, 3); st = recordArenaStats(st, 8);
ok(st.matches === 3 && st.top1 === 1 && st.top4 === 2 && st.placementSum === 12, 'ghi thong ke 3 tran dung');
ok(avgPlacement(st) === 4, 'hang trung binh = 4.0');
ok(avgPlacement(emptyStats()) === null, 'chua co tran -> hang trung binh null');

console.log(`\nKet qua test-auth: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
