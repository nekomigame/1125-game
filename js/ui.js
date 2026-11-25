// =========================================================
// UI 描画・DOM 更新・演出制御
// =========================================================

window.CryptoMiner = window.CryptoMiner || {};

window.CryptoMiner.UI = (function () {
  const DATA = window.CryptoMiner.DATA;
  const Format = window.CryptoMiner.Format;
  const Engine = window.CryptoMiner.Engine;

  let currentTab = "rigs";
  let buyMode = "1";
  let lastUnlockedRigCount = -1;
  let lastAvailableUpgradeIds = "";

  // DOM 参照キャッシュ
  const el = {};

  function cacheElements() {
    el.headerCoins = document.getElementById("header-coins");
    el.headerCps = document.getElementById("header-cps");
    el.headerGb = document.getElementById("header-gb");
    el.notationLabel = document.getElementById("notation-label");

    el.mainCoins = document.getElementById("main-coins");
    el.mainCps = document.getElementById("main-cps");
    el.clickStage = document.getElementById("click-stage");
    el.btnMine = document.getElementById("btn-mine");
    el.clickPowerText = document.getElementById("click-power-text");

    el.forkCountBadge = document.getElementById("fork-count-badge");
    el.pendingGb = document.getElementById("pending-gb");
    el.forkProgressBar = document.getElementById("fork-progress-bar");
    el.forkNextText = document.getElementById("fork-next-text");
    el.btnOpenForkModal = document.getElementById("btn-open-fork-modal");

    el.statRunCoins = document.getElementById("stat-run-coins");
    el.statTotalClicks = document.getElementById("stat-total-clicks");
    el.statTotalMult = document.getElementById("stat-total-mult");

    el.badgeRigs = document.getElementById("badge-rigs");
    el.badgeUpgrades = document.getElementById("badge-upgrades");
    el.badgeGenesis = document.getElementById("badge-genesis");
    el.badgeAchievements = document.getElementById("badge-achievements");

    el.rigsList = document.getElementById("rigs-list");
    el.upgradesList = document.getElementById("upgrades-list");
    el.purchasedUpgradeCount = document.getElementById("purchased-upgrade-count");
    el.purchasedUpgradesList = document.getElementById("purchased-upgrades-list");

    el.genesisBalance = document.getElementById("genesis-balance");
    el.genesisPassiveBonus = document.getElementById("genesis-passive-bonus");
    el.autobuyerPanel = document.getElementById("autobuyer-panel");
    el.toggleAutobuyer = document.getElementById("toggle-autobuyer");
    el.genesisShopList = document.getElementById("genesis-shop-list");

    el.achievementSummary = document.getElementById("achievement-summary");
    el.achievementBonusText = document.getElementById("achievement-bonus-text");
    el.achievementsList = document.getElementById("achievements-list");

    el.toastContainer = document.getElementById("toast-container");
  }

  function getBuyMode() {
    return buyMode;
  }

  function setBuyMode(mode) {
    buyMode = mode;
    document.querySelectorAll("#buy-mode-group .mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    renderRigs();
  }

  function setTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".tab-content").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });
    renderAllLists();
  }

  /**
   * 設備リストを描画する
   */
  function renderRigs() {
    const state = Engine.getState();
    const stats = Engine.calculateStats();
    const n = state.notation;

    const html = DATA.RIGS.map((rig, idx) => {
      const unlocked = Engine.isRigUnlocked(idx);
      const owned = state.rigs[rig.id] || 0;
      const rigCps = stats.rigCpsMap[rig.id];

      if (!unlocked) {
        return `
          <div class="rig-card locked">
            <div class="rig-main">
              <div class="rig-icon">🔒</div>
              <div class="rig-info">
                <div class="rig-title-row">
                  <span class="rig-name">???（未解放設備）</span>
                </div>
                <div class="rig-desc">前の設備を購入するか、採掘を進めることで解放されます。</div>
              </div>
            </div>
          </div>
        `;
      }

      let qty = 1;
      let cost = 0;
      if (buyMode === "max") {
        const maxInfo = Engine.getMaxAffordableRig(rig.id);
        qty = maxInfo.count;
        cost = maxInfo.cost;
      } else {
        qty = Number(buyMode) || 1;
        cost = Engine.getRigCost(rig.id, qty);
      }

      const canAfford = (buyMode === "max" ? qty > 0 : state.coins >= cost);
      const qtyLabel = buyMode === "max" ? `x${Math.max(1, qty)}` : `x${qty}`;

      return `
        <div class="rig-card ${canAfford ? "affordable" : ""}" data-rig-card="${rig.id}">
          <div class="rig-main">
            <div class="rig-icon">${rig.icon}</div>
            <div class="rig-info">
              <div class="rig-title-row">
                <span class="rig-name">${rig.name}</span>
                <span class="rig-count">${owned} 台</span>
              </div>
              <div class="rig-desc">${rig.desc}</div>
              <div class="rig-production">
                単体: +${Format.formatNumber(rigCps.single, n)}/s ｜ 合計: +${Format.formatNumber(rigCps.total, n)}/s
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn ${canAfford ? "btn-primary" : "btn-secondary"} rig-buy-btn"
            data-buy-rig="${rig.id}"
            ${canAfford ? "" : "disabled"}
          >
            <span class="rig-buy-qty">購入 (${qtyLabel})</span>
            <span class="rig-buy-cost">${Format.formatNumber(cost, n)}</span>
          </button>
        </div>
      `;
    }).join("");

    el.rigsList.innerHTML = html;
  }

  /**
   * 通常アップグレード一覧を描画する
   */
  function renderUpgrades() {
    const state = Engine.getState();
    const n = state.notation;

    const available = DATA.UPGRADES.filter(
      (u) => !state.upgrades.includes(u.id) && Engine.isUpgradeUnlocked(u)
    ).sort((a, b) => a.cost - b.cost);

    if (available.length === 0) {
      el.upgradesList.innerHTML = `<p class="toolbar-label">現在購入可能な強化はありません。設備を増やすと新しい強化が出現します。</p>`;
    } else {
      el.upgradesList.innerHTML = available.map((up) => {
        const canAfford = state.coins >= up.cost;
        return `
          <div class="upgrade-card ${canAfford ? "affordable" : ""}" data-upgrade-card="${up.id}">
            <div>
              <div class="upgrade-header">
                <span class="upgrade-icon">${up.icon}</span>
                <span class="upgrade-name">${up.name}</span>
              </div>
              <p class="upgrade-desc">${up.desc}</p>
            </div>
            <button
              type="button"
              class="btn ${canAfford ? "btn-primary" : "btn-secondary"} btn-sm btn-full"
              data-buy-upgrade="${up.id}"
              ${canAfford ? "" : "disabled"}
            >
              購入: ${Format.formatNumber(up.cost, n)} Coin
            </button>
          </div>
        `;
      }).join("");
    }

    el.purchasedUpgradeCount.textContent = state.upgrades.length.toString();
    el.purchasedUpgradesList.innerHTML = state.upgrades
      .map((id) => {
        const up = DATA.UPGRADES.find((u) => u.id === id);
        return up ? `<span class="purchased-chip">${up.icon} ${up.name}</span>` : "";
      })
      .join("");
  }

  /**
   * ジェネシスショップ（永続強化）を描画する
   */
  function renderGenesisShop() {
    const state = Engine.getState();
    const n = state.notation;

    el.genesisBalance.textContent = `${Format.formatNumber(state.genesisBlocks, n)} GB`;
    el.genesisPassiveBonus.textContent = `+${Format.formatNumber(state.genesisBlocks * 10, n)}%`;

    const autobuyerUnlocked = (state.genesisUpgrades.gen_autobuyer || 0) >= 1;
    el.autobuyerPanel.hidden = !autobuyerUnlocked;
    el.toggleAutobuyer.checked = Boolean(state.autobuyerEnabled);

    el.genesisShopList.innerHTML = DATA.GENESIS_UPGRADES.map((gen) => {
      const lv = state.genesisUpgrades[gen.id] || 0;
      const isMax = lv >= gen.maxLevel;
      const cost = Engine.getGenesisUpgradeCost(gen.id);
      const canAfford = !isMax && state.genesisBlocks >= cost;

      return `
        <div class="rig-card ${canAfford ? "affordable" : ""}">
          <div class="rig-main">
            <div class="rig-icon">${gen.icon}</div>
            <div class="rig-info">
              <div class="rig-title-row">
                <span class="rig-name">${gen.name}</span>
                <span class="rig-count">Lv ${lv} / ${gen.maxLevel}</span>
              </div>
              <div class="rig-desc">${gen.desc}</div>
            </div>
          </div>
          <button
            type="button"
            class="btn ${canAfford ? "btn-amber" : "btn-secondary"} rig-buy-btn"
            data-buy-genesis="${gen.id}"
            ${canAfford ? "" : "disabled"}
          >
            <span class="rig-buy-qty">${isMax ? "最大レベル" : "強化する"}</span>
            <span class="rig-buy-cost">${isMax ? "MAX" : `${cost} GB`}</span>
          </button>
        </div>
      `;
    }).join("");
  }

  /**
   * 実績一覧を描画する
   */
  function renderAchievements() {
    const state = Engine.getState();
    const unlockedCount = state.achievements.length;
    const totalCount = DATA.ACHIEVEMENTS.length;

    el.achievementSummary.textContent = `${unlockedCount} / ${totalCount}`;
    el.achievementBonusText.textContent = `ボーナス: +${unlockedCount * 2}%`;

    el.achievementsList.innerHTML = DATA.ACHIEVEMENTS.map((ach) => {
      const unlocked = state.achievements.includes(ach.id);
      return `
        <div class="achievement-card ${unlocked ? "unlocked" : ""}">
          <div class="achievement-title">
            <span>${unlocked ? ach.icon : "🔒"}</span>
            <span>${ach.name}</span>
          </div>
          <div class="achievement-desc">${ach.desc}</div>
        </div>
      `;
    }).join("");
  }

  /**
   * 全ショップ・一覧リストを再描画する
   */
  function renderAllLists() {
    renderRigs();
    renderUpgrades();
    renderGenesisShop();
    renderAchievements();
  }

  /**
   * 毎フレーム呼ばれる軽量な数値・ボタン状態の更新
   */
  function updateDynamicUI() {
    const state = Engine.getState();
    const stats = Engine.calculateStats();
    const n = state.notation;

    // ヘッダーとメイン残高
    el.headerCoins.textContent = Format.formatNumber(state.coins, n);
    el.headerCps.textContent = `${Format.formatNumber(stats.cps, n)}/s`;
    el.headerGb.textContent = `${Format.formatNumber(state.genesisBlocks, n)} GB`;
    el.notationLabel.textContent = n === "suffix" ? "接尾辞" : "指数";

    el.mainCoins.textContent = Format.formatNumber(state.coins, n);
    el.mainCps.textContent = Format.formatNumber(stats.cps, n);
    el.clickPowerText.textContent = `+${Format.formatNumber(stats.clickPower, n)} Coin / click`;

    // ハードフォーク進捗
    const fork = Engine.getForkProgress();
    el.forkCountBadge.textContent = `転生回数: ${state.forkCount}`;
    el.pendingGb.textContent = `+${Format.formatNumber(fork.pending, n)} GB`;
    el.forkProgressBar.style.width = `${(fork.progress * 100).toFixed(1)}%`;
    el.forkNextText.textContent = `次の GB まで: ${Format.formatNumber(fork.remaining, n)} Coin`;
    el.btnOpenForkModal.disabled = fork.pending <= 0;

    // ミニ統計
    el.statRunCoins.textContent = Format.formatNumber(state.runCoins, n);
    el.statTotalClicks.textContent = Format.formatNumber(state.totalClicks, n);
    el.statTotalMult.textContent = `x${stats.totalGlobalMult.toFixed(2)}`;

    // 設備のアンロック変化・アップグレード出現変化を検知したらリスト再描画
    const unlockedRigCount = DATA.RIGS.filter((_, i) => Engine.isRigUnlocked(i)).length;
    const availableUpgrades = DATA.UPGRADES.filter(
      (u) => !state.upgrades.includes(u.id) && Engine.isUpgradeUnlocked(u)
    );
    const availableUpIdsStr = availableUpgrades.map((u) => u.id).join(",");

    if (unlockedRigCount !== lastUnlockedRigCount) {
      lastUnlockedRigCount = unlockedRigCount;
      renderRigs();
    }
    if (availableUpIdsStr !== lastAvailableUpgradeIds) {
      lastAvailableUpgradeIds = availableUpIdsStr;
      renderUpgrades();
    }

    // 設備ボタンの購入可否とMax表記のリアルタイム更新
    let affordableRigsCount = 0;
    DATA.RIGS.forEach((rig, idx) => {
      if (!Engine.isRigUnlocked(idx)) return;
      const btn = el.rigsList.querySelector(`[data-buy-rig="${rig.id}"]`);
      const card = el.rigsList.querySelector(`[data-rig-card="${rig.id}"]`);
      if (!btn || !card) return;

      let qty = 1;
      let cost = 0;
      if (buyMode === "max") {
        const maxInfo = Engine.getMaxAffordableRig(rig.id);
        qty = maxInfo.count;
        cost = maxInfo.cost;
      } else {
        qty = Number(buyMode) || 1;
        cost = Engine.getRigCost(rig.id, qty);
      }

      const canAfford = (buyMode === "max" ? qty > 0 : state.coins >= cost);
      if (canAfford) affordableRigsCount++;

      btn.disabled = !canAfford;
      btn.classList.toggle("btn-primary", canAfford);
      btn.classList.toggle("btn-secondary", !canAfford);
      card.classList.toggle("affordable", canAfford);

      if (buyMode === "max") {
        btn.querySelector(".rig-buy-qty").textContent = `購入 (x${Math.max(1, qty)})`;
        btn.querySelector(".rig-buy-cost").textContent = Format.formatNumber(cost, n);
      }
    });

    // アップグレードボタンの購入可否更新
    let affordableUpgradesCount = 0;
    availableUpgrades.forEach((up) => {
      const btn = el.upgradesList.querySelector(`[data-buy-upgrade="${up.id}"]`);
      const card = el.upgradesList.querySelector(`[data-upgrade-card="${up.id}"]`);
      const canAfford = state.coins >= up.cost;
      if (canAfford) affordableUpgradesCount++;
      if (btn && card) {
        btn.disabled = !canAfford;
        btn.classList.toggle("btn-primary", canAfford);
        btn.classList.toggle("btn-secondary", !canAfford);
        card.classList.toggle("affordable", canAfford);
      }
    });

    // バッジ更新
    updateBadge(el.badgeRigs, affordableRigsCount);
    updateBadge(el.badgeUpgrades, affordableUpgradesCount);
    updateBadge(el.badgeGenesis, fork.pending > 0 ? 1 : 0, "!");
  }

  function updateBadge(badgeEl, count, customText = null) {
    if (!badgeEl) return;
    if (count > 0) {
      badgeEl.textContent = customText || count.toString();
      badgeEl.classList.add("visible");
    } else {
      badgeEl.classList.remove("visible");
    }
  }

  /**
   * クリック時のフローティング数値演出を生成する
   */
  function spawnFloatingText(clientX, clientY, amount) {
    const stageRect = el.clickStage.getBoundingClientRect();
    const x = clientX ? clientX - stageRect.left : stageRect.width / 2;
    const y = clientY ? clientY - stageRect.top : stageRect.height / 2;

    const span = document.createElement("span");
    span.className = "floating-text";
    span.textContent = `+${Format.formatNumber(amount, Engine.getState().notation)}`;
    span.style.left = `${x}px`;
    span.style.top = `${y - 10}px`;

    el.clickStage.appendChild(span);
    setTimeout(() => {
      span.remove();
    }, 850);
  }

  /**
   * 画面右下にトースト通知を表示する
   */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.hidden = false;
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.hidden = true;
  }

  return {
    cacheElements,
    getBuyMode,
    setBuyMode,
    setTab,
    renderRigs,
    renderUpgrades,
    renderGenesisShop,
    renderAchievements,
    renderAllLists,
    updateDynamicUI,
    spawnFloatingText,
    showToast,
    openModal,
    closeModal
  };
})();
