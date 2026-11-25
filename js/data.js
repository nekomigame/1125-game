// =========================================================
// マスターデータ定義（設備・強化・ハードフォーク・実績）
// =========================================================

window.CryptoMiner = window.CryptoMiner || {};

window.CryptoMiner.DATA = {
  // ハードフォーク解放および1個目獲得に必要な周回累計コイン
  FORK_THRESHOLD: 1e6,

  // マイニング設備（8ティア）
  RIGS: [
    {
      id: "laptop",
      name: "古いノートPC",
      icon: "💻",
      desc: "CPUの空きリソースで細々とハッシュ計算を行う。",
      baseCost: 15,
      baseCps: 1,
      costGrowth: 1.15
    },
    {
      id: "gpu",
      name: "ゲーミングGPU",
      icon: "🎮",
      desc: "並列演算でCPUよりはるかに高速にノンスを探索する。",
      baseCost: 100,
      baseCps: 8,
      costGrowth: 1.15
    },
    {
      id: "rig6x",
      name: "専用マイニングリグ",
      icon: "🖥️",
      desc: "6枚のGPUを搭載したオープンフレームの専用機。",
      baseCost: 1100,
      baseCps: 47,
      costGrowth: 1.15
    },
    {
      id: "asic",
      name: "ASICマイナー",
      icon: "🔌",
      desc: "特定アルゴリズムに特化した専用集積回路マシン。",
      baseCost: 12000,
      baseCps: 260,
      costGrowth: 1.15
    },
    {
      id: "immersion",
      name: "液浸冷却ファーム",
      icon: "❄️",
      desc: "絶縁性冷却液にマシンを丸ごと沈めて限界駆動させる。",
      baseCost: 130000,
      baseCps: 1400,
      costGrowth: 1.15
    },
    {
      id: "geothermal",
      name: "地熱データセンター",
      icon: "🌋",
      desc: "地熱発電所の隣に建設された超大規模マイニング施設。",
      baseCost: 1400000,
      baseCps: 7800,
      costGrowth: 1.15
    },
    {
      id: "satellite",
      name: "軌道上ソーラー衛星",
      icon: "🛰️",
      desc: "宇宙空間の太陽光と絶対零度の排熱を利用した採掘衛星。",
      baseCost: 20000000,
      baseCps: 44000,
      costGrowth: 1.15
    },
    {
      id: "quantum",
      name: "量子ブロックチェーン炉",
      icon: "⚛️",
      desc: "量子重ね合わせで全ブロックを同時に検証する究極の設備。",
      baseCost: 330000000,
      baseCps: 260000,
      costGrowth: 1.15
    }
  ],

  // 通常アップグレード（ハードフォーク時にリセット）
  UPGRADES: [
    // クリック強化
    {
      id: "click_1",
      name: "カスタムマイニングスクリプト",
      icon: "⌨️",
      desc: "手動マイニングの採掘量が 2倍 になる。",
      cost: 100,
      type: "click_mult",
      value: 2,
      req: { type: "clicks", amount: 10 }
    },
    {
      id: "click_2",
      name: "メカニカルキーボード",
      icon: "🖱️",
      desc: "手動マイニングの採掘量が 3倍 になる。",
      cost: 1200,
      type: "click_mult",
      value: 3,
      req: { type: "clicks", amount: 50 }
    },
    {
      id: "click_cps_1",
      name: "手動ノンス最適化",
      icon: "⚡",
      desc: "クリック採掘量に現在の秒間採掘量(CPS)の 2% を加算する。",
      cost: 15000,
      type: "click_cps_ratio",
      value: 0.02,
      req: { type: "runCoins", amount: 5000 }
    },
    {
      id: "click_cps_2",
      name: "ニューラル連打支援",
      icon: "🧠",
      desc: "クリック採掘量にさらに CPS の 5% を加算する。",
      cost: 500000,
      type: "click_cps_ratio",
      value: 0.05,
      req: { type: "runCoins", amount: 200000 }
    },

    // 設備別倍率強化
    {
      id: "laptop_1",
      name: "グリス塗り替え",
      icon: "💻",
      desc: "古いノートPCの採掘量が 2倍 になる。",
      cost: 150,
      type: "rig_mult",
      target: "laptop",
      value: 2,
      req: { type: "rig", target: "laptop", amount: 5 }
    },
    {
      id: "laptop_2",
      name: "軽量Linux導入",
      icon: "🐧",
      desc: "古いノートPCの採掘量が 2倍 になる。",
      cost: 1500,
      type: "rig_mult",
      target: "laptop",
      value: 2,
      req: { type: "rig", target: "laptop", amount: 25 }
    },
    {
      id: "gpu_1",
      name: "カスタムBIOS適用",
      icon: "🎮",
      desc: "ゲーミングGPUの採掘量が 2倍 になる。",
      cost: 1000,
      type: "rig_mult",
      target: "gpu",
      value: 2,
      req: { type: "rig", target: "gpu", amount: 5 }
    },
    {
      id: "gpu_2",
      name: "メモリタイミング最適化",
      icon: "🎮",
      desc: "ゲーミングGPUの採掘量が 2倍 になる。",
      cost: 12000,
      type: "rig_mult",
      target: "gpu",
      value: 2,
      req: { type: "rig", target: "gpu", amount: 25 }
    },
    {
      id: "rig6x_1",
      name: "デュアル電源化",
      icon: "🖥️",
      desc: "専用マイニングリグの採掘量が 2倍 になる。",
      cost: 11000,
      type: "rig_mult",
      target: "rig6x",
      value: 2,
      req: { type: "rig", target: "rig6x", amount: 5 }
    },
    {
      id: "asic_1",
      name: "高効率ファン換装",
      icon: "🔌",
      desc: "ASICマイナーの採掘量が 2倍 になる。",
      cost: 120000,
      type: "rig_mult",
      target: "asic",
      value: 2,
      req: { type: "rig", target: "asic", amount: 5 }
    },
    {
      id: "immersion_1",
      name: "ナノ流体冷却液",
      icon: "❄️",
      desc: "液浸冷却ファームの採掘量が 2倍 になる。",
      cost: 1300000,
      type: "rig_mult",
      target: "immersion",
      value: 2,
      req: { type: "rig", target: "immersion", amount: 5 }
    },
    {
      id: "geothermal_1",
      name: "超臨界タービン",
      icon: "🌋",
      desc: "地熱データセンターの採掘量が 2倍 になる。",
      cost: 14000000,
      type: "rig_mult",
      target: "geothermal",
      value: 2,
      req: { type: "rig", target: "geothermal", amount: 5 }
    },

    // 全体強化
    {
      id: "global_1",
      name: "マイニングプール参加",
      icon: "🌐",
      desc: "全設備の採掘量が 1.5倍 になる。",
      cost: 5000,
      type: "global_mult",
      value: 1.5,
      req: { type: "runCoins", amount: 2000 }
    },
    {
      id: "global_2",
      name: "ブロックサイズ最適化",
      icon: "📦",
      desc: "全設備の採掘量が 2倍 になる。",
      cost: 250000,
      type: "global_mult",
      value: 2,
      req: { type: "runCoins", amount: 100000 }
    },
    {
      id: "global_3",
      name: "ゼロ知識証明圧縮",
      icon: "🔐",
      desc: "全設備の採掘量が 2倍 になる。",
      cost: 25000000,
      type: "global_mult",
      value: 2,
      req: { type: "runCoins", amount: 10000000 }
    }
  ],

  // ジェネシスショップ（永続強化・GBで購⼊）
  GENESIS_UPGRADES: [
    {
      id: "gen_hash_boost",
      name: "アルゴリズム最適化",
      icon: "🚀",
      desc: "全設備の採掘量を永続的に +25% / Lv 増加させる。",
      baseCost: 1,
      costGrowth: 2,
      maxLevel: 20
    },
    {
      id: "gen_click_boost",
      name: "オーバークロック回路",
      icon: "⚡",
      desc: "クリック採掘量を永続的に +50% / Lv 増加させる。",
      baseCost: 1,
      costGrowth: 2,
      maxLevel: 15
    },
    {
      id: "gen_cost_discount",
      name: "バルク購入契約",
      icon: "🏷️",
      desc: "設備の購入コストを永続的に -5% / Lv 割引する（最大35%）。",
      baseCost: 2,
      costGrowth: 3,
      maxLevel: 7
    },
    {
      id: "gen_premine",
      name: "プレマイニング資金",
      icon: "💰",
      desc: "ハードフォーク直後から初期コイン(1,000 × Lv²)を持って開始する。",
      baseCost: 2,
      costGrowth: 2.5,
      maxLevel: 10
    },
    {
      id: "gen_autobuyer",
      name: "自動投資ボット",
      icon: "🤖",
      desc: "購入可能な設備と通常強化を1秒ごとに自動購入する機能を解放する。",
      baseCost: 5,
      costGrowth: 1,
      maxLevel: 1
    }
  ],

  // 実績リスト（1つ達成につき全採掘量 +2%）
  ACHIEVEMENTS: [
    {
      id: "ach_first_click",
      name: "最初のハッシュ",
      icon: "⛏️",
      desc: "手動マイニングを1回実行する。",
      check: (s) => s.totalClicks >= 1
    },
    {
      id: "ach_click_100",
      name: "高速シージ",
      icon: "👆",
      desc: "累計クリック回数が100回に到達する。",
      check: (s) => s.totalClicks >= 100
    },
    {
      id: "ach_first_rig",
      name: "不労所得の始まり",
      icon: "💻",
      desc: "任意のマイニング設備を1台購入する。",
      check: (s) => Object.values(s.rigs).some((c) => c >= 1)
    },
    {
      id: "ach_rigs_50",
      name: "小さなマイニング工場",
      icon: "🏭",
      desc: "設備の合計所持台数が50台に到達する。",
      check: (s) => Object.values(s.rigs).reduce((a, b) => a + b, 0) >= 50
    },
    {
      id: "ach_cps_1k",
      name: "キロハッシュ時代",
      icon: "📈",
      desc: "秒間採掘量 (CPS) が 1,000 に到達する。",
      check: (_s, stats) => stats.cps >= 1000
    },
    {
      id: "ach_cps_1m",
      name: "メガハッシュ・タイクーン",
      icon: "💎",
      desc: "秒間採掘量 (CPS) が 1,000,000 に到達する。",
      check: (_s, stats) => stats.cps >= 1e6
    },
    {
      id: "ach_first_fork",
      name: "ジェネシス誕生",
      icon: "🔱",
      desc: "ハードフォークを1回実行する。",
      check: (s) => s.forkCount >= 1
    },
    {
      id: "ach_fork_5",
      name: "分岐するチェーン",
      icon: "⛓️",
      desc: "ハードフォークを累計5回実行する。",
      check: (s) => s.forkCount >= 5
    }
  ]
};
