// 키보드 입력(눌린 키 Set).
export function createInput() {
  const keys = new Set();
  addEventListener('keydown', (e) => { keys.add(e.code); });
  addEventListener('keyup', (e) => { keys.delete(e.code); });
  addEventListener('blur', () => keys.clear());
  return keys;
}
