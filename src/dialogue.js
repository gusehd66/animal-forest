// 대화창 UI + 줄 넘기기. Space로 진행/닫기.
export class Dialogue {
  constructor() {
    this.box = document.createElement('div');
    this.box.id = 'dialogue';
    this.box.className = 'hidden';
    document.body.appendChild(this.box);
    this.open = false; this.lines = []; this.i = 0; this.name = '';
  }
  start(name, lines) {
    this.name = name; this.lines = lines; this.i = 0; this.open = true; this._render();
  }
  advance() {
    if (!this.open) return;
    this.i++;
    if (this.i >= this.lines.length) this.close();
    else this._render();
  }
  close() { this.open = false; this.box.classList.add('hidden'); }
  _render() {
    this.box.classList.remove('hidden');
    const last = this.i >= this.lines.length - 1;
    this.box.innerHTML =
      `<div class="dname">${this.name}</div><div class="dtext">${this.lines[this.i]}</div>` +
      `<div class="dhint">Space ${last ? '✕' : '▸'}</div>`;
  }
}
