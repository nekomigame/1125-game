// =========================================================
// セーブ・ロード & オフライン進行管理
// =========================================================

window.CryptoMiner = window.CryptoMiner || {};

window.CryptoMiner.Storage = (function () {
  const SAVE_KEY = "crypto_miner_idle_save_v1";
  const MAX_OFFLINE_SECONDS = 24 * 60 * 60; // 最大24時間
  const OFFLINE_EFFICIENCY = 0.8; // オフライン採掘効率 80%

  /**
   * ゲーム状態を localStorage へ保存する
   */
  function save(state) {
    try {
      const payload = {
        ...state,
        lastSavedAt: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error("セーブデータの保存に失敗しました:", err);
      return false;
    }
  }

  /**
   * localStorage からセーブデータを読み込む
   * @returns {Object|null}
   */
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error("セーブデータの読み込みに失敗しました:", err);
      return null;
    }
  }

  /**
   * セーブデータを Base64 文字列にエクスポートする
   */
  function exportString(state) {
    const payload = {
      ...state,
      lastSavedAt: Date.now()
    };
    const json = JSON.stringify(payload);
    // 日本語を含む場合でも安全にエンコードする
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  /**
   * Base64 文字列をデコードしてセーブデータオブジェクトに変換する
   */
  function importString(base64Str) {
    const trimmed = (base64Str || "").trim();
    if (!trimmed) {
      throw new Error("セーブ文字列が空です。");
    }
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || typeof parsed.coins !== "number") {
      throw new Error("不正なセーブデータ形式です。");
    }
    return parsed;
  }

  /**
   * オフライン中の経過時間と獲得コインを計算する
   */
  function calculateOffline(lastSavedAt, currentCps) {
    if (!lastSavedAt || currentCps <= 0) {
      return { elapsedSeconds: 0, earned: 0 };
    }
    const now = Date.now();
    const rawElapsed = Math.max(0, (now - lastSavedAt) / 1000);
    if (rawElapsed < 3) {
      return { elapsedSeconds: 0, earned: 0 };
    }
    const clampedSeconds = Math.min(MAX_OFFLINE_SECONDS, rawElapsed);
    const earned = clampedSeconds * currentCps * OFFLINE_EFFICIENCY;
    return {
      elapsedSeconds: clampedSeconds,
      earned
    };
  }

  /**
   * セーブデータを完全に削除する
   */
  function clear() {
    localStorage.removeItem(SAVE_KEY);
  }

  return {
    save,
    load,
    exportString,
    importString,
    calculateOffline,
    clear
  };
})();
