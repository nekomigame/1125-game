// =========================================================
// ゲームエンジン（状態管理・計算ロジック・Tickループ）
// =========================================================

window.CryptoMiner = window.CryptoMiner || {};

window.CryptoMiner.Engine = (function () {
  const DATA = window.CryptoMiner.DATA;

  /**
   * 初期ゲーム状態を生成する
   * @returns {Object}
   */
  function createInitialState() {
    const rigs = {};
    DATA.RIGS.forEach((rig) => {
      rigs[rig.id] = 0;
    });

    const genesisUpgrades = {};
    DATA.GENESIS_UPGRADES.forEach((up) => {
      genesisUpgrades[up.id] = 0;
    });

    return {
      coins: 0,
      runCoins: 0,
      totalCoins: 0,
      totalClicks: 0,
      rigs,
      upgrades: [],
      genesisBlocks: 0,
      totalGenesisEarned: 0,
      forkCount: 0,
      genesisUpgrades,
      achievements: [],
      autobuyerEnabled: false,
      notation: "suffix",
      lastSavedAt: Date.now()
    };
  }

  let state = createInitialState();
  let onAchievementUnlocked = null;

  /**
   * 現在の状態を取得する
   */
  function getState() {
    return state;
  }

  /**
   * 外部から読み込んだ状態を安全にマージして適用する
   */
  function setState(loaded) {
    const base = createInitialState();
    state = {
      ...base,
      ...loaded,
      rigs: { ...base.rigs, ...(loaded.rigs || {}) },
      genesisUpgrades: { ...base.genesisUpgrades, ...(loaded.genesisUpgrades || {}) },
      upgrades: Array.isArray(loaded.upgrades) ? [...loaded.upgrades] : [],
      achievements: Array.isArray(loaded.achievements) ? [...loaded.achievements] : []
    };
  }

  function setAchievementCallback(cb) {
    onAchievementUnlocked = cb;
  }

  /**
   * 設備コスト割引率（バルク購入契約）を取得する
   */
  function getRigDiscountFactor() {
    const lv = state.genesisUpgrades.gen_cost_discount || 0;
    return 1 - Math.min(0.35, lv * 0.05);
  }

  /**
   * 指定した設備を count 台購入する際の合計コストを計算する
   */
  function getRigCost(rigId, count = 1) {
    const rig = DATA.RIGS.find((r) => r.id === rigId);
    if (!rig || count <= 0) return 0;

    const owned = state.rigs[rigId] || 0;
    const r = rig.costGrowth;
    const discount = getRigDiscountFactor();
    const firstCost = rig.baseCost * Math.pow(r, owned);

    if (count === 1) {
      return Math.ceil(firstCost * discount);
    }
    const total = firstCost * ((Math.pow(r, count) - 1) / (r - 1));
    return Math.ceil(total * discount);
  }

  /**
   * 現在の所持コインで購入可能な最大台数とコストを返す
   */
  function getMaxAffordableRig(rigId) {
    const rig = DATA.RIGS.find((r) => r.id === rigId);
    if (!rig) return { count: 0, cost: 0 };

    const owned = state.rigs[rigId] || 0;
    const r = rig.costGrowth;
    const discount = getRigDiscountFactor();
    const firstCost = rig.baseCost * Math.pow(r, owned) * discount;

    if (state.coins < firstCost) {
      return { count: 0, cost: Math.ceil(firstCost) };
    }

    // 等比数列の和 <= coins となる最大整数 k を算出
    const ratio = (state.coins * (r - 1)) / firstCost + 1;
    let count = Math.floor(Math.log(ratio) / Math.log(r));
    if (count < 1) count = 1;

    // 浮動小数点誤差による超過を補正
    while (count > 0 && getRigCost(rigId, count) > state.coins) {
      count--;
    }
    while (getRigCost(rigId, count + 1) <= state.coins) {
      count++;
    }

    return {
      count,
      cost: count > 0 ? getRigCost(rigId, count) : Math.ceil(firstCost)
    };
  }

  /**
   * 設備がアンロック済みかを判定する
   */
  function isRigUnlocked(index) {
    if (index === 0) return true;
    const prevRig = DATA.RIGS[index - 1];
    const currentRig = DATA.RIGS[index];
    if ((state.rigs[currentRig.id] || 0) > 0) return true;
    if ((state.rigs[prevRig.id] || 0) >= 1) return true;
    return state.runCoins >= currentRig.baseCost * 0.3;
  }

  /**
   * 現在の各種倍率・CPS・クリック単価を計算する
   */
  function calculateStats() {
    let globalMult = 1;
    let clickMult = 1;
    let clickCpsRatio = 0;
    const rigMults = {};

    DATA.RIGS.forEach((r) => {
      rigMults[r.id] = 1;
    });

    // 通常アップグレードの効果を集計
    state.upgrades.forEach((upId) => {
      const up = DATA.UPGRADES.find((u) => u.id === upId);
      if (!up) return;

      if (up.type === "global_mult") {
        globalMult *= up.value;
      } else if (up.type === "click_mult") {
        clickMult *= up.value;
      } else if (up.type === "click_cps_ratio") {
        clickCpsRatio += up.value;
      } else if (up.type === "rig_mult" && rigMults[up.target] !== undefined) {
        rigMults[up.target] *= up.value;
      }
    });

    // ジェネシスブロックのパッシブボーナス（1個につき +10%）
    const gbPassiveMult = 1 + state.genesisBlocks * 0.1;

    // ジェネシス強化（アルゴリズム最適化 & クリック強化）
    const genHashMult = 1 + (state.genesisUpgrades.gen_hash_boost || 0) * 0.25;
    const genClickMult = 1 + (state.genesisUpgrades.gen_click_boost || 0) * 0.5;

    // 実績ボーナス（1つにつき +2%）
    const achievementMult = 1 + state.achievements.length * 0.02;

    const totalGlobalMult = globalMult * gbPassiveMult * genHashMult * achievementMult;

    // 設備ごとの秒間採掘量を算出
    let totalCps = 0;
    const rigCpsMap = {};
    DATA.RIGS.forEach((rig) => {
      const count = state.rigs[rig.id] || 0;
      const singleCps = rig.baseCps * rigMults[rig.id] * totalGlobalMult;
      const sumCps = singleCps * count;
      rigCpsMap[rig.id] = { single: singleCps, total: sumCps };
      totalCps += sumCps;
    });

    const clickPower = (1 * clickMult * genClickMult * gbPassiveMult * achievementMult) + (totalCps * clickCpsRatio);

    return {
      cps: totalCps,
      clickPower,
      totalGlobalMult,
      gbPassiveMult,
      achievementMult,
      rigCpsMap
    };
  }

  /**
   * 手動マイニング（クリック）を実行する
   * @returns {number} 獲得コイン量
   */
  function manualMine() {
    const stats = calculateStats();
    const gained = stats.clickPower;
    state.coins += gained;
    state.runCoins += gained;
    state.totalCoins += gained;
    state.totalClicks += 1;
    checkAchievements();
    return gained;
  }

  /**
   * 指定した設備を購入する
   */
  function buyRig(rigId, mode = "1") {
    let qty = 0;
    let cost = 0;

    if (mode === "max") {
      const maxInfo = getMaxAffordableRig(rigId);
      qty = maxInfo.count;
      cost = maxInfo.cost;
    } else {
      qty = Number(mode) || 1;
      cost = getRigCost(rigId, qty);
    }

    if (qty <= 0 || state.coins < cost) return false;

    state.coins -= cost;
    state.rigs[rigId] = (state.rigs[rigId] || 0) + qty;
    checkAchievements();
    return true;
  }

  /**
   * 通常アップグレードの購入条件（アンロック）を満たしているか判定する
   */
  function isUpgradeUnlocked(upgrade) {
    const req = upgrade.req;
    if (!req) return true;
    if (req.type === "clicks") return state.totalClicks >= req.amount;
    if (req.type === "runCoins") return state.runCoins >= req.amount;
    if (req.type === "rig") return (state.rigs[req.target] || 0) >= req.amount;
    return true;
  }

  /**
   * 通常アップグレードを購入する
   */
  function buyUpgrade(upgradeId) {
    if (state.upgrades.includes(upgradeId)) return false;
    const up = DATA.UPGRADES.find((u) => u.id === upgradeId);
    if (!up || !isUpgradeUnlocked(up) || state.coins < up.cost) return false;

    state.coins -= up.cost;
    state.upgrades.push(upgradeId);
    checkAchievements();
    return true;
  }

  /**
   * 購入可能な通常アップグレードを安い順にすべて購入する
   */
  function buyAllUpgrades() {
    const candidates = DATA.UPGRADES
      .filter((u) => !state.upgrades.includes(u.id) && isUpgradeUnlocked(u))
      .sort((a, b) => a.cost - b.cost);

    let boughtAny = false;
    for (const up of candidates) {
      if (state.coins >= up.cost) {
        state.coins -= up.cost;
        state.upgrades.push(up.id);
        boughtAny = true;
      }
    }
    if (boughtAny) checkAchievements();
    return boughtAny;
  }

  /**
   * ジェネシス強化の現在レベルと次レベルコストを取得する
   */
  function getGenesisUpgradeCost(genId) {
    const gen = DATA.GENESIS_UPGRADES.find((g) => g.id === genId);
    if (!gen) return Infinity;
    const lv = state.genesisUpgrades[genId] || 0;
    if (lv >= gen.maxLevel) return Infinity;
    return Math.ceil(gen.baseCost * Math.pow(gen.costGrowth, lv));
  }

  /**
   * ジェネシス強化を購入する
   */
  function buyGenesisUpgrade(genId) {
    const gen = DATA.GENESIS_UPGRADES.find((g) => g.id === genId);
    if (!gen) return false;
    const lv = state.genesisUpgrades[genId] || 0;
    if (lv >= gen.maxLevel) return false;

    const cost = getGenesisUpgradeCost(genId);
    if (state.genesisBlocks < cost) return false;

    state.genesisBlocks -= cost;
    state.genesisUpgrades[genId] = lv + 1;
    if (genId === "gen_autobuyer") {
      state.autobuyerEnabled = true;
    }
    return true;
  }

  /**
   * 現在の周回累計から獲得可能なジェネシスブロック数を計算する
   */
  function getPendingGenesisBlocks() {
    if (state.runCoins < DATA.FORK_THRESHOLD) return 0;
    return Math.floor(Math.pow(state.runCoins / DATA.FORK_THRESHOLD, 1 / 3));
  }

  /**
   * 次のジェネシスブロック獲得に必要な周回累計コインと進捗率(0〜1)を返す
   */
  function getForkProgress() {
    const pending = getPendingGenesisBlocks();
    const currentThreshold = pending === 0 ? 0 : DATA.FORK_THRESHOLD * Math.pow(pending, 3);
    const nextThreshold = DATA.FORK_THRESHOLD * Math.pow(pending + 1, 3);
    const span = nextThreshold - currentThreshold;
    const progress = span > 0 ? Math.min(1, Math.max(0, (state.runCoins - currentThreshold) / span)) : 0;

    return {
      pending,
      nextThreshold,
      remaining: Math.max(0, nextThreshold - state.runCoins),
      progress
    };
  }

  /**
   * ハードフォーク（プレステージ）を実行する
   */
  function performHardFork() {
    const gainedGb = getPendingGenesisBlocks();
    if (gainedGb <= 0) return 0;

    state.genesisBlocks += gainedGb;
    state.totalGenesisEarned += gainedGb;
    state.forkCount += 1;

    // プレマイニング資金（初期コイン）の計算
    const premineLv = state.genesisUpgrades.gen_premine || 0;
    const startCoins = premineLv > 0 ? 1000 * premineLv * premineLv : 0;

    // 周回データのリセット
    state.coins = startCoins;
    state.runCoins = startCoins;
    state.upgrades = [];
    DATA.RIGS.forEach((r) => {
      state.rigs[r.id] = 0;
    });

    checkAchievements();
    return gainedGb;
  }

  /**
   * 自動投資ボット（1秒ごとの自動購入）を実行する
   */
  function runAutobuyer() {
    if ((state.genesisUpgrades.gen_autobuyer || 0) < 1 || !state.autobuyerEnabled) {
      return false;
    }

    let changed = false;
    if (buyAllUpgrades()) {
      changed = true;
    }

    // 購入可能な最安の設備を1つ購入
    let cheapestRigId = null;
    let cheapestCost = Infinity;
    DATA.RIGS.forEach((rig, idx) => {
      if (!isRigUnlocked(idx)) return;
      const cost = getRigCost(rig.id, 1);
      if (state.coins >= cost && cost < cheapestCost) {
        cheapestCost = cost;
        cheapestRigId = rig.id;
      }
    });

    if (cheapestRigId && buyRig(cheapestRigId, "1")) {
      changed = true;
    }

    return changed;
  }

  /**
   * 実績の達成状況をチェックし、新規解除を通知する
   */
  function checkAchievements() {
    const stats = calculateStats();
    DATA.ACHIEVEMENTS.forEach((ach) => {
      if (!state.achievements.includes(ach.id) && ach.check(state, stats)) {
        state.achievements.push(ach.id);
        if (typeof onAchievementUnlocked === "function") {
          onAchievementUnlocked(ach);
        }
      }
    });
  }

  /**
   * ゲームループの1ステップ（時間経過による自動採掘）
   */
  function tick(deltaSeconds) {
    if (deltaSeconds <= 0) return;
    const stats = calculateStats();
    const earned = stats.cps * deltaSeconds;
    if (earned > 0) {
      state.coins += earned;
      state.runCoins += earned;
      state.totalCoins += earned;
    }
    checkAchievements();
  }

  return {
    createInitialState,
    getState,
    setState,
    setAchievementCallback,
    getRigCost,
    getMaxAffordableRig,
    isRigUnlocked,
    calculateStats,
    manualMine,
    buyRig,
    isUpgradeUnlocked,
    buyUpgrade,
    buyAllUpgrades,
    getGenesisUpgradeCost,
    buyGenesisUpgrade,
    getPendingGenesisBlocks,
    getForkProgress,
    performHardFork,
    runAutobuyer,
    checkAchievements,
    tick
  };
})();
