// localStorage 저장/불러오기. 상태는 순수 데이터라 그대로 직렬화.
const KEY = 'grid-island-save-v1';

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function writeSave(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 용량초과 등 무시 */ }
}
export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
