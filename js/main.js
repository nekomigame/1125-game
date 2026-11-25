// =========================================================
// エントリーポイント（初期化・イベント登録・メインループ）
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const { Format, Engine, Storage, UI } = window.CryptoMiner;

  UI.cacheElements();

  // セーブデータの読み込みとオフライン進行の適用
  const saved = Storage.load();
  if (saved) {
    Engine.setState(saved);
    const stats = Engine.calculateStats();
    const offline = Storage.calculateOffline(saved.lastSavedAt, stats.cps);
    if (offline.earned > 0) {
      const state = Engine.getState();
      state.coins += offline.earned;
      state.runCoins += offline.earned;
      state.totalCoins += offline.earned;

      document.getElementById("offline-duration").textContent = Format.formatDuration(offline.elapsedSeconds);
      document.getElementById("offline-reward").textContent = `+${Format.formatNumber(offline.earned, state.notation)} Coin`;
      UI.openModal("modal-offline");
    }
  }

  // 実績解除時の通知設定
  Engine.setAchievementCallback((ach) => {
    UI.showToast(`実績解除: ${ach.icon} ${ach.name}（全採掘量 +2%）`, "achievement");
    UI.renderAchievements();
  });

  // 初回描画
  Engine.checkAchievements();
  UI.renderAllLists();
  UI.updateDynamicUI();

  // 手動マイニングボタン
  document.getElementById("btn-mine").addEventListener("click", (e) => {
    const gained = Engine.manualMine();
    UI.spawnFloatingText(e.clientX, e.clientY, gained);
    UI.updateDynamicUI();
  });

  // タブ切り替え
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      UI.setTab(btn.dataset.tab);
    });
  });

  // 購入モード切り替え（x1, x10, x100, Max）
  document.querySelectorAll("#buy-mode-group .mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      UI.setBuyMode(btn.dataset.mode);
    });
  });

  // 設備購入（イベントデリゲーション）
  document.getElementById("rigs-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy-rig]");
    if (!btn) return;
    if (Engine.buyRig(btn.dataset.buyRig, UI.getBuyMode())) {
      UI.renderRigs();
      UI.updateDynamicUI();
    }
  });

  // アップグレード購入（イベントデリゲーション）
  document.getElementById("upgrades-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy-upgrade]");
    if (!btn) return;
    if (Engine.buyUpgrade(btn.dataset.buyUpgrade)) {
      UI.renderAllLists();
      UI.updateDynamicUI();
    }
  });

  // アップグレード一括購入
  document.getElementById("btn-buy-all-upgrades").addEventListener("click", () => {
    if (Engine.buyAllUpgrades()) {
      UI.renderAllLists();
      UI.updateDynamicUI();
      UI.showToast("購入可能な強化をすべて購入しました。");
    }
  });

  // ジェネシス強化購入（イベントデリゲーション）
  document.getElementById("genesis-shop-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy-genesis]");
    if (!btn) return;
    if (Engine.buyGenesisUpgrade(btn.dataset.buyGenesis)) {
      UI.renderAllLists();
      UI.updateDynamicUI();
      UI.showToast("永続強化をアップグレードしました。");
    }
  });

  // オートバイヤー ON/OFF
  document.getElementById("toggle-autobuyer").addEventListener("change", (e) => {
    Engine.getState().autobuyerEnabled = e.target.checked;
  });

  // ハードフォーク確認モーダルを開く
  document.getElementById("btn-open-fork-modal").addEventListener("click", () => {
    const pending = Engine.getPendingGenesisBlocks();
    if (pending <= 0) return;
    document.getElementById("fork-modal-reward").textContent =
      `+${Format.formatNumber(pending, Engine.getState().notation)} GB`;
    UI.openModal("modal-fork");
  });

  // ハードフォーク実行確定
  document.getElementById("btn-confirm-fork").addEventListener("click", () => {
    const gained = Engine.performHardFork();
    UI.closeModal("modal-fork");
    if (gained > 0) {
      Storage.save(Engine.getState());
      UI.renderAllLists();
      UI.updateDynamicUI();
      UI.showToast(`ハードフォーク完了！ +${gained} GB を獲得しました。`, "achievement");
    }
  });

  // 数値表記モード切り替え
  document.getElementById("btn-toggle-notation").addEventListener("click", () => {
    const state = Engine.getState();
    state.notation = state.notation === "suffix" ? "scientific" : "suffix";
    UI.renderAllLists();
    UI.updateDynamicUI();
  });

  // 設定モーダルを開く
  document.getElementById("btn-open-settings").addEventListener("click", () => {
    UI.openModal("modal-settings");
  });

  // モーダル閉じるボタン＆背景クリック
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      UI.closeModal(btn.dataset.closeModal);
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.hidden = true;
      }
    });
  });

  // 手動セーブ
  document.getElementById("btn-manual-save").addEventListener("click", () => {
    if (Storage.save(Engine.getState())) {
      UI.showToast("ゲームをセーブしました。");
    }
  });

  // エクスポート
  document.getElementById("btn-export-save").addEventListener("click", () => {
    const encoded = Storage.exportString(Engine.getState());
    const textarea = document.getElementById("save-io-textarea");
    textarea.value = encoded;
    textarea.select();
    UI.showToast("セーブ文字列を書き出しました。コピーして保管してください。");
  });

  // インポート
  document.getElementById("btn-import-save").addEventListener("click", () => {
    const textarea = document.getElementById("save-io-textarea");
    try {
      const parsed = Storage.importString(textarea.value);
      Engine.setState(parsed);
      Storage.save(Engine.getState());
      UI.renderAllLists();
      UI.updateDynamicUI();
      UI.closeModal("modal-settings");
      UI.showToast("セーブデータを読み込みました。");
    } catch (err) {
      UI.showToast(`読み込み失敗: ${err.message}`);
    }
  });

  // 完全初期化
  document.getElementById("btn-hard-reset").addEventListener("click", () => {
    if (!window.confirm("本当にすべてのセーブデータを削除して最初からやり直しますか？")) {
      return;
    }
    Storage.clear();
    Engine.setState(Engine.createInitialState());
    UI.renderAllLists();
    UI.updateDynamicUI();
    UI.closeModal("modal-settings");
    UI.showToast("データを完全に初期化しました。");
  });

  // メインゲームループ（100ms 間隔）
  let lastTickTime = performance.now();
  let autobuyerAccum = 0;
  let autosaveAccum = 0;

  setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;

    Engine.tick(dt);

    // 1秒ごとにオートバイヤー実行
    autobuyerAccum += dt;
    if (autobuyerAccum >= 1) {
      autobuyerAccum -= 1;
      if (Engine.runAutobuyer()) {
        UI.renderAllLists();
      }
    }

    // 15秒ごとに自動セーブ
    autosaveAccum += dt;
    if (autosaveAccum >= 15) {
      autosaveAccum = 0;
      Storage.save(Engine.getState());
    }

    UI.updateDynamicUI();
  }, 100);

  // ページを離れる直前にセーブ
  window.addEventListener("beforeunload", () => {
    Storage.save(Engine.getState());
  });
});
