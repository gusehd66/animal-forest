// 간단 인벤토리 + HUD + 획득 토스트. 아이템 정보는 content 레지스트리 공용.
import { info } from './data/content.js';

export class Inventory {
  constructor() {
    this.items = {};
    this.el = document.getElementById('inv');
    this.toastEl = document.getElementById('toast');
    this._render();
  }
  setItems(obj) { this.items = obj || {}; this._render(); }  // 저장 복원용(토스트 없음)
  add(id, n = 1) {
    this.items[id] = (this.items[id] || 0) + n;
    this._render();
    const i = info(id);
    if (i) this.toast(`${i.emoji} ${i.name} +${n}`);
  }
  remove(id, n = 1) {
    this.items[id] = Math.max(0, (this.items[id] || 0) - n);
    if (this.items[id] === 0) delete this.items[id];
    this._render();
  }
  _render() {
    const keys = Object.keys(this.items).filter(k => this.items[k] > 0);
    this.el.innerHTML = keys.length
      ? keys.map(k => { const i = info(k); return `<span class="chip">${i ? i.emoji : '❔'} ${this.items[k]}</span>`; }).join('')
      : '<span class="empty">🎒 가방이 비었어요</span>';
  }
  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hide');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.toastEl.classList.add('hide'), 1400);
  }
}
