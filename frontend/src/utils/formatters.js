// src/utils/formatters.js
/**
 * 初年度登録年月の4桁数値を「YYYY年MM月」形式に変換
 * @param {number|string} yearValue - 4桁の数値（西暦下2桁+月2桁）
 * @returns {string} フォーマットされた日付文字列
 */
export function formatRegistrationDate(yearValue) {
  if (!yearValue) return '不明';
  
  const value = String(yearValue).padStart(4, '0');
  
  if (value.length !== 4) return value;
  
  const yearPart = value.substring(0, 2);
  const monthPart = value.substring(2, 4);
  
  // 20世紀・21世紀の判断（必要に応じてカスタマイズ）
  let century = 20;
  // 例：23は2023年、99は1999年と判断する場合
  if (parseInt(yearPart, 10) < 80) {
    century = 20; // 2000年代
  } else {
    century = 19; // 1900年代
  }
  
  const fullYear = (century * 100) + parseInt(yearPart, 10);
  
  return `${fullYear}年${monthPart}月`;
}

// その他のフォーマット関数
export function formatPlate(plate) {
  if (!plate) return '未登録';
  return plate.replace(/\s+/g, ' ').replace(/\n/g, '').trim();
}

// 他のフォーマット関数も追加可能