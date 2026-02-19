/**
 * 名将传 V2.1 - 战斗金币、成就奖励显示、教程图文
 */

const STAT_NAMES = { strategy: '策略', command: '统帅', martial: '武力', influence: '威望' };
const STAT_KEYS = ['strategy', 'command', 'martial', 'influence'];

const GENERALS = [
  { name: '项羽', strategy: 6, command: 9, martial: 10, influence: 10 },
  { name: '韩信', strategy: 10, command: 10, martial: 5, influence: 9 },
  { name: '卫青', strategy: 8, command: 9, martial: 7, influence: 9 },
  { name: '霍去病', strategy: 7, command: 9, martial: 9, influence: 9 },
  { name: '关羽', strategy: 6, command: 7, martial: 10, influence: 10 },
  { name: '李靖', strategy: 9, command: 10, martial: 7, influence: 8 },
  { name: '岳飞', strategy: 8, command: 9, martial: 10, influence: 10 },
  { name: '白起', strategy: 9, command: 10, martial: 7, influence: 9 },
  { name: '吕布', strategy: 3, command: 6, martial: 10, influence: 7 },
  { name: '赵云', strategy: 7, command: 8, martial: 10, influence: 8 },
];

const ACHIEVEMENTS = [
  { id: 'tutorial', name: '循规蹈矩', reward: 10 },
  { id: 'first_win', name: '初出茅庐', reward: 10 },
  { id: 'first_lose', name: '出师未捷', reward: 5 },
  { id: 'yunzhou', name: '运筹帷幄', reward: 5 },
  { id: 'shenji', name: '神机妙算', reward: 10 },
  { id: 'yongbing', name: '用兵如神', reward: 15 },
  { id: 'rich', name: '富可敌国', reward: 100 },
  { id: 'streak', name: '常胜将军', reward: 20 },
];

const TUTORIAL_PAGES = [
  '欢迎来到名将传！本教程将帮助你了解游戏基本规则。',
  '<strong>攻方与守方</strong>：游戏开始时抛硬币决定。<br><span class="tutorial-visual">攻 ← 硬币 → 防</span><br>攻方可先选择本回合比较的属性，守方则被动应战。攻方具有策略主动权。',
  '<strong>选将</strong>：从8张牌（4明4暗）中轮流选将，每人4张。<br><span class="tutorial-visual">🂠 🂠 🂠 🂠（明）<br>🂠 🂠 🂠 🂠（暗）</span><br>明牌可见，暗牌盲选。',
  '<strong>战斗</strong>：每回合比较「属性值+骰点」。骰子点数为 <span class="tutorial-dice">0、1、2、3</span> 四种，概率相同。<br><span class="tutorial-visual">属性 + 骰子 = 总分 → 高者胜</span><br>败方下回合成为攻方。',
  '完成教程将获得 <strong>10 金</strong>奖励！准备好了就开始对战吧。',
];

const STORAGE_KEY = 'mingjiang_v2';

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return {
    gold: 0,
    username: '',
    achievements: {},
    hardModeUnlocked: false,
    tutorialCompleted: false,
    totalWins: 0,
    totalLosses: 0,
    winStreak: 0,
  };
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {}
}

const persist = loadState();

const state = {
  phase: 'home',
  playerFirst: null,
  deck: [],
  playerHand: [],
  npcHand: [],
  battleRound: 0,
  playerScore: 0,
  npcScore: 0,
  attacker: null,
  playerSelectedCard: null,
  npcSelectedCard: null,
  chosenAttr: null,
  roundWinner: null,
  hardMode: false,
  npcZhanhao: false,
  tutorialPage: 0,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDice() {
  return Math.floor(Math.random() * 4);
}

function updateGoldDisplay() {
  const el = document.getElementById('gold-display');
  if (el) el.textContent = `${persist.gold} 金`;
}

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(el => el.classList.add('hidden'));
  const phase = document.getElementById(id);
  if (phase) phase.classList.remove('hidden');
  state.phase = id.replace('phase-', '');
  updateGoldDisplay();
}

function getStat(general, attr) {
  return general[attr] ?? 0;
}

// ---------- 主界面 ----------
function goHome() {
  const sub = document.getElementById('home-subtitle');
  if (sub) sub.textContent = (persist.username || '玩家') + ' vs 草莽';
  showPhase('phase-home');
  updateGoldDisplay();
  updateHardModeButton();
}

function updateHardModeButton() {
  const btn = document.getElementById('btn-hard');
  if (!btn) return;
  if (persist.hardModeUnlocked) {
    btn.textContent = '困难模式（已解锁）';
    btn.disabled = false;
  } else if (persist.gold >= 100) {
    btn.textContent = '困难模式（可解锁！）';
    btn.disabled = false;
  } else {
    btn.textContent = `困难模式（需100金，当前${persist.gold}）`;
    btn.disabled = true;
  }
}

// ---------- 用户名 ----------
function checkUsernameAndStart() {
  if (!persist.username || persist.username.trim() === '') {
    showPhase('phase-username');
    document.getElementById('username-input').value = '';
    document.getElementById('username-input').focus();
    return false;
  }
  return true;
}

function confirmUsername() {
  const input = document.getElementById('username-input');
  const name = (input.value || '玩家').trim().slice(0, 20);
  persist.username = name;
  saveState(persist);
  goHome();
}

// ---------- 新手教程 ----------
function startTutorial() {
  state.tutorialPage = 0;
  showPhase('phase-tutorial');
  renderTutorialPage();
  document.getElementById('btn-tutorial-next').classList.remove('hidden');
  document.getElementById('btn-tutorial-complete').classList.add('hidden');
}

function renderTutorialPage() {
  const content = document.getElementById('tutorial-content');
  content.innerHTML = `<div class="tutorial-page">${TUTORIAL_PAGES[state.tutorialPage]}</div>`;
  const nextBtn = document.getElementById('btn-tutorial-next');
  const completeBtn = document.getElementById('btn-tutorial-complete');
  if (state.tutorialPage >= TUTORIAL_PAGES.length - 1) {
    nextBtn.classList.add('hidden');
    completeBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
    completeBtn.classList.add('hidden');
  }
}

function completeTutorial() {
  if (!persist.achievements.tutorial) {
    persist.achievements.tutorial = true;
    persist.gold += 10;
    saveState(persist);
    checkRichAchievement();
  }
  persist.tutorialCompleted = true;
  saveState(persist);
  goHome();
  updateGoldDisplay();
}

// ---------- 成就 ----------
function openAchievements() {
  showPhase('phase-achievements');
  const list = document.getElementById('achievements-list');
  list.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const done = !!persist.achievements[ach.id];
    const div = document.createElement('div');
    div.className = 'achievement-item ' + (done ? 'completed' : 'uncompleted');
    div.innerHTML = `<span class="achievement-check">${done ? '✓' : '○'}</span><span>${ach.name}${done ? '（已完成）' : ''}</span><span class="achievement-reward">奖励：${ach.reward} 金</span>`;
    list.appendChild(div);
  });
}

// ---------- 开始游戏 ----------
function startNormalGame() {
  if (!checkUsernameAndStart()) return;
  state.hardMode = false;
  runCoinFlip();
  showPhase('phase-coin');
}

function startHardGame() {
  if (!persist.hardModeUnlocked) {
    if (persist.gold < 100) {
      alert(`需要 100 金方可解锁困难模式，当前拥有 ${persist.gold} 金。`);
      return;
    }
    persist.hardModeUnlocked = true;
    persist.gold -= 100;
    saveState(persist);
    alert('困难模式已解锁！草莽获得「战吼」能力：每回合50%概率在比较属性上+2。');
    updateGoldDisplay();
  }
  if (!checkUsernameAndStart()) return;
  state.hardMode = true;
  runCoinFlip();
  showPhase('phase-coin');
}

// ---------- 硬币 ----------
function runCoinFlip() {
  const coin = document.getElementById('coin');
  const resultEl = document.getElementById('coin-result');
  const btn = document.getElementById('btn-after-coin');
  resultEl.classList.add('hidden');
  btn.classList.add('hidden');
  coin.classList.remove('flip');

  void coin.offsetWidth;
  const isHeads = Math.random() < 0.5;
  state.playerFirst = isHeads;
  state.attacker = isHeads ? 'player' : 'npc';

  coin.classList.remove('result-heads', 'result-tails');
  coin.classList.add('flip');
  setTimeout(() => {
    coin.classList.remove('flip');
    coin.classList.add(isHeads ? 'result-heads' : 'result-tails');
    resultEl.textContent = isHeads ? '你是攻方' : '你是守方';
    resultEl.classList.remove('hidden');
    btn.classList.remove('hidden');
  }, 1200);
}

// ---------- 选将 ----------
function buildDeck() {
  const indices = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 8);
  const revealedIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4);
  state.deck = indices.map((i, idx) => ({
    ...GENERALS[i],
    revealed: revealedIndices.includes(idx),
    taken: false,
  }));
}

function renderDeck() {
  const container = document.getElementById('deck');
  container.innerHTML = '';
  state.deck.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card' + (!card.revealed ? ' covered' : '') + (card.taken ? ' taken' : '');
    el.innerHTML = `
      <span class="card-name">${card.revealed ? card.name : '?'}</span>
      <div class="card-stats">
        ${card.revealed ? STAT_KEYS.map(k => `
          <div class="stat-row">
            <span class="stat-label">${STAT_NAMES[k]}</span>
            <span class="stat-value">${getStat(card, k)}</span>
            <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
          </div>
        `).join('') : ''}
      </div>
    `;
    if (!card.taken) {
      el.addEventListener('click', () => onDeckCardClick(idx));
    }
    container.appendChild(el);
  });
}

function getPickOrder() {
  const first = state.playerFirst ? 'player' : 'npc';
  const second = state.playerFirst ? 'npc' : 'player';
  return [
    { who: first, count: 1 },
    { who: second, count: 2 },
    { who: first, count: 2 },
    { who: second, count: 2 },
    { who: first, count: 1 },
  ];
}

let pickStep = 0;
let pickCount = 0;

function startPickPhase() {
  const pn = persist.username || '你';
  document.getElementById('player-name-label').textContent = pn;
  buildDeck();
  state.playerHand = [];
  state.npcHand = [];
  pickStep = 0;
  pickCount = 0;
  runPickTurn();
  renderDeck();
  renderHands();
  document.getElementById('btn-after-pick').classList.add('hidden');
  showPhase('phase-pick');
}

function runPickTurn() {
  const order = getPickOrder();
  const step = order[pickStep];
  const need = step.count;
  const isPlayer = step.who === 'player';

  document.getElementById('pick-prompt').textContent = isPlayer ? `请选择 ${need} 张武将` : '草莽正在选将……';
  document.getElementById('pick-turn').textContent = isPlayer ? '轮到你选牌' : '草莽选牌中';

  if (!isPlayer) {
    pickCount = need;
    npcPickFromDeck(need);
    return;
  }
  pickCount = need;
}

function onDeckCardClick(idx) {
  if (pickCount <= 0) return;
  const card = state.deck[idx];
  if (!card || card.taken) return;

  card.taken = true;
  state.playerHand.push({ ...card });
  pickCount--;
  renderDeck();
  renderHands();

  if (pickCount > 0) return;

  pickStep++;
  if (pickStep >= getPickOrder().length) {
    document.getElementById('pick-prompt').textContent = '选将结束，准备战斗';
    document.getElementById('pick-turn').textContent = '';
    document.getElementById('btn-after-pick').classList.remove('hidden');
    return;
  }
  setTimeout(runPickTurn, 400);
}

function npcPickFromDeck(need) {
  const pool = state.deck.map((c, i) => ({ card: c, index: i })).filter(({ card }) => !card.taken);
  const revealed = pool.filter(({ card }) => card.revealed);
  const covered = pool.filter(({ card }) => !card.revealed);
  const bothExist = revealed.length > 0 && covered.length > 0;

  const toPick = [];
  if (bothExist) {
    for (let i = 0; i < need && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      toPick.push(pool.splice(idx, 1)[0]);
    }
  } else if (revealed.length > 0) {
    revealed.sort((a, b) => {
      const sumA = STAT_KEYS.reduce((s, k) => s + getStat(a.card, k), 0);
      const sumB = STAT_KEYS.reduce((s, k) => s + getStat(b.card, k), 0);
      return sumB - sumA;
    });
    for (let i = 0; i < need && revealed.length > 0; i++) toPick.push(revealed.shift());
  } else {
    for (let i = 0; i < need && covered.length > 0; i++) {
      const idx = Math.floor(Math.random() * covered.length);
      toPick.push(covered.splice(idx, 1)[0]);
    }
  }

  for (const { card, index } of toPick) {
    state.deck[index].taken = true;
    state.npcHand.push({ ...card });
  }

  renderDeck();
  renderHands();
  pickStep++;
  if (pickStep >= getPickOrder().length) {
    document.getElementById('pick-prompt').textContent = '选将结束，准备战斗';
    document.getElementById('pick-turn').textContent = '';
    document.getElementById('btn-after-pick').classList.remove('hidden');
    return;
  }
  setTimeout(runPickTurn, 600);
}

function renderHands() {
  const pn = persist.username || '你';
  const playerContainer = document.getElementById('hand-player');
  playerContainer.innerHTML = '';
  state.playerHand.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <span class="card-name">${card.name}</span>
      <div class="card-stats">
        ${STAT_KEYS.map(k => `
          <div class="stat-row">
            <span class="stat-label">${STAT_NAMES[k]}</span>
            <span class="stat-value">${getStat(card, k)}</span>
            <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
          </div>
        `).join('')}
      </div>
    `;
    playerContainer.appendChild(el);
  });

  const npcContainer = document.getElementById('hand-npc');
  npcContainer.innerHTML = '';
  state.npcHand.forEach(() => {
    const el = document.createElement('div');
    el.className = 'card covered';
    el.innerHTML = '<span class="card-name">?</span><div class="card-stats"></div>';
    npcContainer.appendChild(el);
  });
}

// ---------- 战斗 ----------
function startBattle() {
  const pn = persist.username || '你';
  document.getElementById('battle-player-name').textContent = pn;
  document.getElementById('battle-slot-player').textContent = pn;
  state.battleRound = 0;
  state.playerScore = 0;
  state.npcScore = 0;
  state.attacker = state.playerFirst ? 'player' : 'npc';
  updateBattleScore();
  showPhase('phase-battle');
  document.getElementById('battle-cards').classList.add('hidden');
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-roll-dice').classList.add('hidden');
  document.getElementById('btn-next-round').classList.add('hidden');
  document.getElementById('battle-zhanhao').classList.add('hidden');
  document.getElementById('battle-zhanhao-npc').classList.add('hidden');
  startBattleRound();
}

function updateBattleScore() {
  document.getElementById('score-player').textContent = state.playerScore;
  document.getElementById('score-npc').textContent = state.npcScore;
}

function startBattleRound() {
  state.battleRound++;
  state.usedPlayerIndices = state.usedPlayerIndices || [];
  state.usedNpcIndices = state.usedNpcIndices || [];
  state.playerSelectedCard = null;
  state.npcSelectedCard = null;
  state.chosenAttr = null;
  state.npcZhanhao = false;
  if (state.hardMode && state.attacker === 'npc') {
    state.npcZhanhao = Math.random() < 0.5;
  }

  const roundHint = document.getElementById('battle-round-hint');
  const isPlayerAttacker = state.attacker === 'player';
  roundHint.textContent = `第 ${state.battleRound} 回合 - 你是${isPlayerAttacker ? '攻方' : '守方'} - 请选择本回合出战的武将`;
  roundHint.classList.remove('hidden');

  const handContainer = document.getElementById('battle-hand-cards');
  handContainer.innerHTML = '';
  state.playerHand.forEach((card, idx) => {
    const used = state.usedPlayerIndices.includes(idx);
    const el = document.createElement('div');
    el.className = 'card' + (used ? ' taken' : '');
    el.dataset.index = String(idx);
    if (!used) {
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-stats">
          ${STAT_KEYS.map(k => `
            <div class="stat-row">
              <span class="stat-label">${STAT_NAMES[k]}</span>
              <span class="stat-value">${getStat(card, k)}</span>
              <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
            </div>
          `).join('')}
        </div>
      `;
      el.addEventListener('click', () => onPlayerSelectBattleCard(idx));
    } else {
      el.innerHTML = '<span class="card-name">已出</span>';
    }
    handContainer.appendChild(el);
  });

  document.getElementById('battle-cards').classList.add('hidden');
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-roll-dice').classList.add('hidden');
  document.getElementById('btn-next-round').classList.add('hidden');
}

function onPlayerSelectBattleCard(idx) {
  if (state.playerSelectedCard !== null) return;
  if (state.usedPlayerIndices.includes(idx)) return;

  state.playerSelectedCard = { index: idx, card: state.playerHand[idx] };
  const npcIdx = npcChooseBattleCard();
  state.npcSelectedCard = { index: npcIdx, card: state.npcHand[npcIdx] };

  document.getElementById('battle-round-hint').classList.add('hidden');
  document.getElementById('battle-hand-cards').querySelectorAll('.card').forEach(el => {
    el.style.pointerEvents = 'none';
    if (parseInt(el.dataset.index, 10) === idx) el.style.borderColor = 'var(--gold)';
  });

  if (state.attacker === 'player') {
    document.getElementById('battle-choose-attr').textContent = '请选择本回合比较的属性';
    document.getElementById('battle-choose-attr').classList.remove('hidden');
    document.getElementById('attr-buttons').classList.remove('hidden');
    document.querySelectorAll('.attr-btn').forEach(btn => {
      btn.disabled = false;
      btn.onclick = () => onPlayerChooseAttr(btn.dataset.attr);
    });
  } else {
    const attr = npcChooseAttr(state.npcSelectedCard.card);
    state.chosenAttr = attr;
    setTimeout(() => revealAndRoll(attr), 500);
  }
}

function npcChooseBattleCard() {
  const used = state.usedNpcIndices || [];
  let bestIdx = -1;
  let bestMax = -1;
  state.npcHand.forEach((card, idx) => {
    if (used.includes(idx)) return;
    const maxStat = Math.max(...STAT_KEYS.map(k => getStat(card, k)));
    if (maxStat > bestMax) {
      bestMax = maxStat;
      bestIdx = idx;
    }
  });
  if (bestIdx === -1) {
    const available = state.npcHand.map((_, i) => i).filter(i => !used.includes(i));
    bestIdx = available[Math.floor(Math.random() * available.length)];
  }
  return bestIdx;
}

function npcChooseAttr(npcCard) {
  let bestAttr = STAT_KEYS[0];
  let bestVal = getStat(npcCard, bestAttr);
  STAT_KEYS.forEach(k => {
    const v = getStat(npcCard, k);
    if (v > bestVal) {
      bestVal = v;
      bestAttr = k;
    }
  });
  return bestAttr;
}

function onPlayerChooseAttr(attr) {
  state.chosenAttr = attr;
  document.getElementById('battle-choose-attr').classList.add('hidden');
  document.getElementById('attr-buttons').classList.add('hidden');
  document.querySelectorAll('.attr-btn').forEach(btn => { btn.onclick = null; });
  revealAndRoll(attr);
}

function revealAndRoll(attr) {
  const slotPlayer = document.getElementById('battle-card-player');
  const slotNpc = document.getElementById('battle-card-npc');
  const dicePlayer = document.getElementById('battle-dice-player');
  const diceNpc = document.getElementById('battle-dice-npc');
  const zhanhaoNpc = document.getElementById('battle-zhanhao-npc');

  const pCard = state.playerSelectedCard.card;
  const nCard = state.npcSelectedCard.card;

  const statRow = (k, card, highlight) => `
    <div class="stat-row${highlight ? ' stat-highlight' : ''}">
      <span class="stat-label">${STAT_NAMES[k]}</span>
      <span class="stat-value">${getStat(card, k)}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${getStat(card, k) * 10}%"></div></div>
    </div>
  `;
  slotPlayer.innerHTML = `
    <span class="card-name">${pCard.name}</span>
    <div class="card-stats">
      ${STAT_KEYS.map(k => statRow(k, pCard, k === attr)).join('')}
    </div>
  `;
  slotNpc.innerHTML = `
    <span class="card-name">${nCard.name}</span>
    <div class="card-stats">
      ${STAT_KEYS.map(k => statRow(k, nCard, k === attr)).join('')}
    </div>
  `;

  if (state.npcZhanhao) {
    zhanhaoNpc.textContent = '战吼发动！+2';
    zhanhaoNpc.classList.remove('hidden');
  } else {
    zhanhaoNpc.classList.add('hidden');
  }
  document.getElementById('battle-zhanhao').classList.add('hidden');

  document.getElementById('battle-cards').classList.remove('hidden');
  dicePlayer.textContent = '';
  diceNpc.textContent = '';
  document.getElementById('battle-round-result').classList.add('hidden');
  document.getElementById('btn-roll-dice').classList.remove('hidden');
  document.getElementById('btn-roll-dice').onclick = () => doRollAndCompare(attr, pCard, nCard);
}

function doRollAndCompare(attr, pCard, nCard) {
  const dicePlayer = document.getElementById('battle-dice-player');
  const diceNpc = document.getElementById('battle-dice-npc');
  document.getElementById('btn-roll-dice').classList.add('hidden');
  document.getElementById('btn-roll-dice').onclick = null;

  const d1 = rollDice();
  const d2 = rollDice();
  let pTotal = getStat(pCard, attr) + d1;
  let nTotal = getStat(nCard, attr) + d2;
  if (state.npcZhanhao) nTotal += 2;

  dicePlayer.textContent = `${STAT_NAMES[attr]} ${getStat(pCard, attr)} + 骰 ${d1} = ${pTotal}`;
  diceNpc.textContent = `${STAT_NAMES[attr]} ${getStat(nCard, attr)} + 骰 ${d2}${state.npcZhanhao ? ' + 战吼2' : ''} = ${nTotal}`;

  const resultEl = document.getElementById('battle-round-result');
  resultEl.classList.remove('win', 'lose');

  if (pTotal > nTotal) {
    const vp = pTotal - nTotal;
    state.playerScore += vp;
    state.roundWinner = 'player';
    resultEl.textContent = `本回合你胜！获得 ${vp} 点胜利分`;
    resultEl.classList.add('win');
  } else if (nTotal > pTotal) {
    const vp = nTotal - pTotal;
    state.npcScore += vp;
    state.roundWinner = 'npc';
    resultEl.textContent = `本回合草莽胜！草莽获得 ${vp} 点胜利分`;
    resultEl.classList.add('lose');
  } else {
    state.roundWinner = null;
    resultEl.textContent = '本回合平局，不记分';
  }
  resultEl.classList.remove('hidden');

  state.usedPlayerIndices.push(state.playerSelectedCard.index);
  state.usedNpcIndices.push(state.npcSelectedCard.index);

  if (state.roundWinner === 'player') state.attacker = 'npc';
  else if (state.roundWinner === 'npc') state.attacker = 'player';

  updateBattleScore();

  if (state.battleRound < 3) {
    document.getElementById('btn-next-round').classList.remove('hidden');
  } else {
    setTimeout(showEndPhase, 1500);
  }
}

function checkAndGrantAchievements(newUnlocks) {
  const diff = state.playerScore - state.npcScore;
  const won = state.playerScore > state.npcScore;

  if (won && !persist.achievements.first_win) {
    persist.achievements.first_win = true;
    persist.gold += 10;
    newUnlocks.push('初出茅庐');
  }
  if (!won && state.playerScore < state.npcScore && !persist.achievements.first_lose) {
    persist.achievements.first_lose = true;
    persist.gold += 5;
    newUnlocks.push('出师未捷');
  }
  if (won && diff >= 1 && diff <= 2 && !persist.achievements.yunzhou) {
    persist.achievements.yunzhou = true;
    persist.gold += 5;
    newUnlocks.push('运筹帷幄');
  }
  if (won && diff >= 3 && diff <= 5 && !persist.achievements.shenji) {
    persist.achievements.shenji = true;
    persist.gold += 10;
    newUnlocks.push('神机妙算');
  }
  if (won && diff > 5 && !persist.achievements.yongbing) {
    persist.achievements.yongbing = true;
    persist.gold += 15;
    newUnlocks.push('用兵如神');
  }
  if (won) {
    persist.totalWins++;
    persist.winStreak++;
    if (persist.winStreak >= 5 && !persist.achievements.streak) {
      persist.achievements.streak = true;
      persist.gold += 20;
      newUnlocks.push('常胜将军');
    }
  } else {
    persist.winStreak = 0;
    persist.totalLosses++;
  }
  if (checkRichAchievement()) newUnlocks.push('富可敌国');
}

function checkRichAchievement() {
  if (persist.gold > 500 && !persist.achievements.rich) {
    persist.achievements.rich = true;
    persist.gold += 100;
    saveState(persist);
    return true;
  }
  return false;
}

function showEndPhase() {
  showPhase('phase-end');
  const resultEl = document.getElementById('end-result');
  const msgEl = document.getElementById('end-message');
  const achEl = document.getElementById('end-achievement');

  const pn = persist.username || '玩家';
  resultEl.textContent = `最终比分为 ${pn} ${state.playerScore} : 草莽 ${state.npcScore}`;

  const diff = Math.abs(state.playerScore - state.npcScore);

  if (state.playerScore === state.npcScore) {
    msgEl.innerHTML = '旗鼓相当。<br>本局金币不变。';
  } else if (state.playerScore < state.npcScore) {
    const loseGold = diff;
    persist.gold = Math.max(0, persist.gold - loseGold);
    saveState(persist);
    msgEl.innerHTML = `胜败乃兵家常事。<br>本局失去 <strong>${loseGold}</strong> 金。`;
  } else {
    let earnGold = diff;
    if (state.hardMode) earnGold *= 2;
    persist.gold += earnGold;
    saveState(persist);
    if (state.hardMode) {
      msgEl.innerHTML = `恭喜主公，获得胜利！<br>本局获得 <strong>${earnGold}</strong> 金（胜利分 ${diff} × 困难模式翻倍）。`;
    } else {
      msgEl.innerHTML = `恭喜主公，获得胜利！<br>本局获得 <strong>${earnGold}</strong> 金。`;
    }
  }

  updateGoldDisplay();

  const newUnlocks = [];
  checkAndGrantAchievements(newUnlocks);
  saveState(persist);
  updateGoldDisplay();

  if (newUnlocks.length > 0) {
    achEl.textContent = '解锁新成就：' + newUnlocks.join('、');
    achEl.classList.remove('hidden');
  } else {
    achEl.classList.add('hidden');
  }
}

function playAgain() {
  state.playerFirst = null;
  state.deck = [];
  state.playerHand = [];
  state.npcHand = [];
  state.usedPlayerIndices = [];
  state.usedNpcIndices = [];
  const coin = document.getElementById('coin');
  coin.classList.remove('flip', 'result-heads', 'result-tails');
  goHome();
}

function nextRound() {
  document.getElementById('btn-next-round').classList.add('hidden');
  startBattleRound();
}

// ---------- 初始化 ----------
document.getElementById('btn-tutorial').addEventListener('click', startTutorial);
document.getElementById('btn-start').addEventListener('click', startNormalGame);
document.getElementById('btn-hard').addEventListener('click', () => {
  startHardGame();
});
document.getElementById('btn-achievements').addEventListener('click', openAchievements);

document.getElementById('btn-confirm-username').addEventListener('click', confirmUsername);
document.getElementById('username-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmUsername();
});

document.getElementById('btn-tutorial-next').addEventListener('click', () => {
  state.tutorialPage++;
  renderTutorialPage();
});
document.getElementById('btn-tutorial-complete').addEventListener('click', completeTutorial);
document.getElementById('btn-back-achievements').addEventListener('click', goHome);

document.getElementById('btn-after-coin').addEventListener('click', () => {
  startPickPhase();
});

document.getElementById('btn-after-pick').addEventListener('click', () => {
  startBattle();
});

document.getElementById('btn-next-round').addEventListener('click', nextRound);
document.getElementById('btn-play-again').addEventListener('click', playAgain);

updateGoldDisplay();
goHome();
