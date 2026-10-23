// Test tu chua cho engine huong dan tuong tac (src/game/tutorial.ts)
// Chay: node scripts/test-tutorial.mjs
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Compile tutorial.ts (pure TS) ra CommonJS de test headless
execSync(
  'npx tsc --ignoreConfig --ignoreDeprecations 6.0 src/game/tutorial.ts --outDir scripts/.build-tutorial --module commonjs --target es2020 --moduleResolution node10 --skipLibCheck --esModuleInterop',
  { cwd: root, stdio: 'inherit' },
);

const {
  TUT_STEPS,
  TUT_REWARD,
  createTutorial,
  currentStep,
  onTutEvent,
  skipTutorial,
  validateSteps,
} = require('./.build-tutorial/tutorial.js');

let pass = 0, fail = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name); cond ? pass++ : fail++; };

// 1. validateSteps
const v = validateSteps();
if (!v.ok) console.log('  validateSteps errors:', v.errors);
check('validateSteps().ok === true', v.ok === true);
check('validateSteps().errors la mang rong khi ok', Array.isArray(v.errors) && v.errors.length === 0);
check('Co it nhat 10 buoc', TUT_STEPS.length >= 10);
check('TUT_REWARD === 50', TUT_REWARD === 50);

// 2. Trang thai ban dau
let s = createTutorial();
check('createTutorial: idx 0, chua finished/skipped', s.idx === 0 && s.finished === false && s.skipped === false);
check('currentStep dau tien la buoc welcome (advanceOn ack)', currentStep(s) !== null && currentStep(s).advanceOn === 'ack');

// 3. Su kien sai khong tien buoc (dang o welcome can ack, gui buy)
{
  const r = onTutEvent(createTutorial(), 'buy');
  check("Su kien sai o buoc welcome ('buy' thay vi 'ack') khong tien buoc", r.advanced === false && r.state.idx === 0 && r.finished === false);
}

// 4. Di het luong dung thu tu
const flow = ['ack', 'buy', 'place', 'combine', 'reroll', 'levelup', 'equip', 'battleStart', 'battleEnd', 'ack', 'ack', 'ack'];
let state = createTutorial();
let advancedCount = 0;
let lastResult = null;
for (const ev of flow) {
  const before = currentStep(state);
  const r = onTutEvent(state, ev);
  if (r.advanced) advancedCount++;
  // Moi su kien trong flow phai khop advanceOn cua buoc hien tai
  if (!before || before.advanceOn !== ev) {
    check(`Flow: buoc ${before ? before.id : 'null'} khop su kien ${ev}`, false);
  }
  state = r.state;
  lastResult = r;
}
check('Di het flow: so buoc tien dung bang so buoc TUT_STEPS', advancedCount === TUT_STEPS.length);
check('Di het flow: so buoc tien dung bang do dai flow (12)', advancedCount === flow.length);
check('Di het flow: finished === true', state.finished === true && lastResult.finished === true);
check('Sau khi finished: currentStep === null', currentStep(state) === null);

// 5. Su kien sai giua chung khong tien buoc: den buoc place roi gui 'buy'
{
  let st = createTutorial();
  st = onTutEvent(st, 'ack').state; // -> buy
  st = onTutEvent(st, 'buy').state; // -> place
  const stepBefore = currentStep(st);
  const r = onTutEvent(st, 'buy'); // sai: buoc place can 'place'
  check("Dang o buoc place, gui 'buy' khong tien buoc", stepBefore && stepBefore.advanceOn === 'place' && r.advanced === false && r.state.idx === st.idx && currentStep(r.state) === stepBefore);
  const r2 = onTutEvent(st, 'place');
  check("Dang o buoc place, gui dung 'place' thi tien buoc", r2.advanced === true && r2.state.idx === st.idx + 1);
}

// 6. Skip giua chung
{
  let st = createTutorial();
  st = onTutEvent(st, 'ack').state;
  st = onTutEvent(st, 'buy').state;
  const skipped = skipTutorial(st);
  check('Skip giua chung: skipped === true', skipped.skipped === true);
  check('Skip giua chung: currentStep === null', currentStep(skipped) === null);
  const r = onTutEvent(skipped, 'place');
  check('Sau khi skip: su kien khong tien buoc nua', r.advanced === false);
}

console.log(`\nTONG: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
