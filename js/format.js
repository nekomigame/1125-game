// =========================================================
// 数値・時間フォーマットユーティリティ
// =========================================================

window.CryptoMiner = window.CryptoMiner || {};

window.CryptoMiner.Format = (function () {
  const SUFFIXES = [
    "", "K", "M", "B", "T",
    "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
    "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"
  ];

  /**
   * 大きな数値を設定に応じた表記文字列に変換する
   * @param {number} value - 変換対象の数値
   * @param {"suffix"|"scientific"} notation - 表記モード
   * @param {number} decimals - 小数点以下の桁数
   * @returns {string}
   */
  function formatNumber(value, notation = "suffix", decimals = 2) {
    if (!Number.isFinite(value)) return "∞";
    if (Math.abs(value) < 1000) {
      if (Math.abs(value) < 10 && value % 1 !== 0) {
        return value.toFixed(1);
      }
      return Math.floor(value).toString();
    }

    if (notation === "scientific") {
      return value.toExponential(decimals).replace("+", "");
    }

    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
    if (tier < SUFFIXES.length) {
      const scaled = value / Math.pow(10, tier * 3);
      return `${scaled.toFixed(decimals)} ${SUFFIXES[tier]}`;
    }

    return value.toExponential(decimals).replace("+", "");
  }

  /**
   * 秒数を読みやすい日本語の時間表記に変換する
   * @param {number} totalSeconds - 経過秒数
   * @returns {string}
   */
  function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}時間`);
    if (m > 0) parts.push(`${m}分`);
    if (s > 0 || parts.length === 0) parts.push(`${s}秒`);
    return parts.join("");
  }

  return {
    formatNumber,
    formatDuration
  };
})();
