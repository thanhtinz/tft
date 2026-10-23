// Engine cho che do HUONG DAN TUONG TAC (pure TS, khong import react)
// Tran luyen tap co cac buoc, moi buoc co thoai mascot, vung highlight (target),
// va chi tien buoc khi nguoi choi phat dung su kien gameplay (advanceOn).

export type TutEvent =
  | 'buy'
  | 'place'
  | 'combine'
  | 'reroll'
  | 'levelup'
  | 'equip'
  | 'battleStart'
  | 'battleEnd'
  | 'ack';

export type TutTarget =
  | 'shop'
  | 'board'
  | 'bench'
  | 'reroll'
  | 'xp'
  | 'item'
  | 'fight'
  | 'synergy'
  | 'gold'
  | 'none';

export interface TutStep {
  id: string;
  title: string;
  text: string;
  target: TutTarget;
  advanceOn: TutEvent;
}

export const TUT_STEPS: TutStep[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến Đấu Trường Chibi',
    text: 'Chào bạn, mình là mascot hướng dẫn đây. Mục tiêu của trận là mua tướng, xếp đội hình thật mạnh rồi đánh bại đối thủ, bấm Đã hiểu để bắt đầu nhé.',
    target: 'none',
    advanceOn: 'ack',
  },
  {
    id: 'buy',
    title: 'Mua tướng đầu tiên',
    text: 'Đây là cửa hàng tướng ở phía dưới. Hãy chạm vào một tướng để mua bằng vàng, tướng vừa mua sẽ xuất hiện trên hàng ghế chờ.',
    target: 'shop',
    advanceOn: 'buy',
  },
  {
    id: 'place',
    title: 'Đặt tướng lên bàn cờ',
    text: 'Giỏi lắm, giờ hãy kéo hoặc chạm để đặt tướng từ hàng ghế chờ lên bàn cờ. Tướng ở trên bàn cờ mới tham gia chiến đấu được.',
    target: 'board',
    advanceOn: 'place',
  },
  {
    id: 'combine',
    title: 'Ghép tướng lên 2 sao',
    text: 'Hãy mua thêm các bản sao giống hệt tướng này nhé. Cứ 3 tướng 1 sao giống nhau sẽ tự ghép thành 1 tướng 2 sao mạnh hơn hẳn, và 3 tướng 2 sao sẽ thành 3 sao.',
    target: 'shop',
    advanceOn: 'combine',
  },
  {
    id: 'reroll',
    title: 'Làm mới cửa hàng',
    text: 'Chưa thấy tướng mình cần thì đừng lo. Bấm nút làm mới để đổi sang 5 tướng khác, mỗi lần làm mới tốn một ít vàng.',
    target: 'reroll',
    advanceOn: 'reroll',
  },
  {
    id: 'levelup',
    title: 'Mua XP và lên cấp',
    text: 'Bấm nút mua XP để tăng cấp cho đội của bạn. Cấp càng cao, bạn càng đặt được nhiều tướng lên bàn cờ cùng lúc.',
    target: 'xp',
    advanceOn: 'levelup',
  },
  {
    id: 'equip',
    title: 'Gắn trang bị cho tướng',
    text: 'Trang bị giúp tướng mạnh lên rõ rệt đó. Hãy kéo một món đồ vào tướng trên bàn cờ để gắn trang bị cho bạn ấy.',
    target: 'item',
    advanceOn: 'equip',
  },
  {
    id: 'battle-start',
    title: 'Bắt đầu chiến đấu',
    text: 'Đội hình đã sẵn sàng rồi, bấm nút Bắt đầu đấu thôi. Trong trận, tướng sẽ tự di chuyển, tự đánh và tung kỹ năng khi đầy năng lượng, bạn chỉ cần ngồi xem và cổ vũ.',
    target: 'fight',
    advanceOn: 'battleStart',
  },
  {
    id: 'battle-end',
    title: 'Xem kết quả trận đấu',
    text: 'Trận luyện tập vừa kết thúc rồi, cùng xem kết quả nhé. Thắng hay thua cũng không sao, quan trọng là bạn đã thấy tướng của mình chiến đấu như thế nào.',
    target: 'fight',
    advanceOn: 'battleEnd',
  },
  {
    id: 'synergy',
    title: 'Tộc và hệ của tướng',
    text: 'Mỗi tướng thuộc một tộc và hệ nhất định, bạn xem ở bảng tộc hệ bên cạnh nhé. Xếp đủ số tướng cùng tộc hoặc hệ trên bàn cờ sẽ kích hoạt sức mạnh cộng thêm cho cả đội.',
    target: 'synergy',
    advanceOn: 'ack',
  },
  {
    id: 'gold',
    title: 'Vàng và tiền lãi',
    text: 'Vàng dùng để mua tướng, làm mới cửa hàng và mua XP. Cuối mỗi vòng bạn còn được tiền lãi theo số vàng đang giữ, giữ càng nhiều vàng thì lãi càng cao, tối đa 5 vàng mỗi vòng.',
    target: 'gold',
    advanceOn: 'ack',
  },
  {
    id: 'finish',
    title: 'Hoàn thành hướng dẫn',
    text: 'Chúc mừng bạn đã nắm được cách chơi cơ bản rồi. Giờ hãy vào trận thật, thử nhiều đội hình khác nhau và leo hạng thật vui nhé.',
    target: 'none',
    advanceOn: 'ack',
  },
];

export interface TutState {
  idx: number;
  finished: boolean;
  skipped: boolean;
}

export const TUT_REWARD = 50;

const VALID_EVENTS: readonly TutEvent[] = [
  'buy',
  'place',
  'combine',
  'reroll',
  'levelup',
  'equip',
  'battleStart',
  'battleEnd',
  'ack',
];

const VALID_TARGETS: readonly TutTarget[] = [
  'shop',
  'board',
  'bench',
  'reroll',
  'xp',
  'item',
  'fight',
  'synergy',
  'gold',
  'none',
];

// Thu tu su kien gameplay bat buoc (khong tinh cac buoc 'ack')
const REQUIRED_GAMEPLAY_ORDER: readonly TutEvent[] = [
  'buy',
  'place',
  'combine',
  'reroll',
  'levelup',
  'equip',
  'battleStart',
  'battleEnd',
];

// Regex kiem tra dai emoji co ban (pictographs, symbols, flags, dingbats...)
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;

export function createTutorial(): TutState {
  return { idx: 0, finished: false, skipped: false };
}

export function currentStep(s: TutState): TutStep | null {
  if (!s || s.finished || s.skipped) return null;
  if (s.idx < 0 || s.idx >= TUT_STEPS.length) return null;
  return TUT_STEPS[s.idx];
}

export function onTutEvent(
  s: TutState,
  ev: TutEvent,
): { state: TutState; advanced: boolean; finished: boolean } {
  const step = currentStep(s);
  if (!step) {
    return { state: s, advanced: false, finished: s ? !!s.finished : false };
  }
  if (ev !== step.advanceOn) {
    return { state: s, advanced: false, finished: false };
  }
  const nextIdx = s.idx + 1;
  const finished = nextIdx >= TUT_STEPS.length;
  const state: TutState = { idx: nextIdx, finished, skipped: false };
  return { state, advanced: true, finished };
}

export function skipTutorial(s: TutState): TutState {
  return { idx: s ? s.idx : 0, finished: true, skipped: true };
}

export function validateSteps(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(TUT_STEPS) || TUT_STEPS.length < 10) {
    errors.push(
      `Can it nhat 10 buoc, hien co ${Array.isArray(TUT_STEPS) ? TUT_STEPS.length : 0}`,
    );
  }

  const seenIds = new Set<string>();
  for (const step of TUT_STEPS) {
    if (!step.id || typeof step.id !== 'string') {
      errors.push('Buoc thieu id');
    } else if (seenIds.has(step.id)) {
      errors.push(`Trung id buoc: ${step.id}`);
    } else {
      seenIds.add(step.id);
    }

    if (!VALID_EVENTS.includes(step.advanceOn)) {
      errors.push(`Buoc ${step.id}: advanceOn khong hop le: ${String(step.advanceOn)}`);
    }
    if (!VALID_TARGETS.includes(step.target)) {
      errors.push(`Buoc ${step.id}: target khong hop le: ${String(step.target)}`);
    }
    if (!step.text || !step.text.trim()) {
      errors.push(`Buoc ${step.id}: text rong`);
    } else if (EMOJI_RE.test(step.text)) {
      errors.push(`Buoc ${step.id}: text chua emoji`);
    }
    if (step.title && EMOJI_RE.test(step.title)) {
      errors.push(`Buoc ${step.id}: title chua emoji`);
    }
  }

  // Kiem tra thu tu su kien gameplay: lay day advanceOn khac 'ack'
  // va doi chieu dung day bat buoc.
  const gameplayOrder = TUT_STEPS.map((st) => st.advanceOn).filter(
    (ev) => ev !== 'ack',
  );
  if (
    gameplayOrder.length !== REQUIRED_GAMEPLAY_ORDER.length ||
    gameplayOrder.some((ev, i) => ev !== REQUIRED_GAMEPLAY_ORDER[i])
  ) {
    errors.push(
      `Thu tu su kien gameplay sai: expected [${REQUIRED_GAMEPLAY_ORDER.join(',')}], got [${gameplayOrder.join(',')}]`,
    );
  }

  return { ok: errors.length === 0, errors };
}
