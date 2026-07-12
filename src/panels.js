// 상점(판매) + 도감 + 제작(DIY) + 박물관(기증) + 주민(대화/선물) UI 패널. 열면 이동 정지.
import { info, priceOf, FISH, BUGS, FOSSILS, RECIPES, SHOP_STOCK } from './data/content.js';
import { PERSON_EMOJI, greetLine } from './data/villagers.js';
import { PIXEL_PALETTE, DESIGN_N } from './design.js';

function panel(id) {
  const el = document.createElement('div');
  el.id = id; el.className = 'panel hidden';
  document.body.appendChild(el);
  return el;
}

export class ShopPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('shop'); this.open = false; this.tab = 'sell'; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _render() {
    const inv = this.ctx.inventory(), money = this.ctx.money();
    const tabs = `<div class="stabs"><button class="stab${this.tab === 'sell' ? ' on' : ''}" data-tab="sell">팔기</button><button class="stab${this.tab === 'buy' ? ' on' : ''}" data-tab="buy">사기</button><span class="smoney">💰 ${money.toLocaleString()} 벨</span></div>`;
    let body;
    if (this.tab === 'sell') {
      const rows = Object.keys(inv).filter(k => inv[k] > 0 && priceOf(k) > 0).map(k => {
        const i = info(k);
        return `<div class="prow"><span>${i.emoji} ${i.name} ×${inv[k]}</span><span class="pprice">${priceOf(k) * inv[k]} 벨</span><button data-sell="${k}">팔기</button></div>`;
      });
      body = rows.length ? rows.join('') + `<button class="pall" data-sellall>전부 팔기</button>` : `<div class="pempty">팔 물건이 없어요</div>`;
    } else {
      body = SHOP_STOCK.map(s => {
        const i = info(s.id), can = money >= s.price;
        return `<div class="prow"><span>${i.emoji} ${i.name}</span><span class="pprice">${s.price} 벨</span><button data-buy="${s.id}" ${can ? '' : 'disabled'}>사기</button></div>`;
      }).join('');
    }
    this.el.innerHTML = `<div class="ptitle">🏪 상점</div>${tabs}${body}<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this._render(); });
    this.el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { this.ctx.sell(b.dataset.sell); this._render(); });
    const all = this.el.querySelector('[data-sellall]'); if (all) all.onclick = () => { this.ctx.sellAll(); this._render(); };
    this.el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { this.ctx.buy(b.dataset.buy); this._render(); });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 가방(인벤토리) 격자 창 — I 키/🎒 버튼으로 열기
export class InventoryPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('inv-panel'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _render() {
    const items = this.ctx.inventory();
    const keys = Object.keys(items).filter(k => items[k] > 0);
    const cells = keys.length
      ? keys.map(k => { const i = info(k); const p = this.ctx.placeable && this.ctx.placeable(k); return `<div class="lcell got${p ? ' place' : ''}"${p ? ` data-place="${k}"` : ''}>${i ? i.emoji : '❔'}<span>${i ? i.name : k}</span><b class="icount">${items[k]}</b>${p ? '<em class="ptag">놓기</em>' : ''}</div>`; }).join('')
      : `<div class="pempty">🎒 가방이 비었어요</div>`;
    this.el.innerHTML = `<div class="ptitle">🎒 가방 (${keys.length}종)</div><div class="pnote" style="margin-bottom:8px">가구·씨앗을 누르면 배치를 시작해요</div><div class="lgrid">${cells}</div><button class="pclose" data-close>닫기 (Esc / I)</button>`;
    this.el.querySelectorAll('[data-place]').forEach(b => b.onclick = () => { this.ctx.place(b.dataset.place); this.close(); });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

export class LogPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('log'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _cells(list, caught, donated) {
    return list.map(x => caught.has(x.id)
      ? `<div class="lcell got">${x.emoji}<span>${x.name}${donated.has(x.id) ? ' ✓' : ''}</span></div>`
      : `<div class="lcell">❔<span>???</span></div>`).join('');
  }
  _render() {
    const col = this.ctx.collection(), d = col.donated;
    this.el.innerHTML =
      `<div class="ptitle">📖 도감 <span class="pnote">(✓ = 기증)</span></div>` +
      `<div class="lsec">🐟 물고기 <b>${col.fish.size}/${FISH.length}</b></div><div class="lgrid">${this._cells(FISH, col.fish, d.fish)}</div>` +
      `<div class="lsec">🦋 곤충 <b>${col.bug.size}/${BUGS.length}</b></div><div class="lgrid">${this._cells(BUGS, col.bug, d.bug)}</div>` +
      `<div class="lsec">🦴 화석 <b>${col.fossil.size}/${FOSSILS.length}</b></div><div class="lgrid">${this._cells(FOSSILS, col.fossil, d.fossil)}</div>` +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 우편: 접속 중인 다른 플레이어에게 아이템 보내기
export class MailPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('mail'); this.open = false; this.code = ''; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _render() {
    const items = this.ctx.giftables();
    this.el.innerHTML = `<div class="ptitle">📬 우편</div>` +
      `<div class="scap">받는 사람 섬 코드</div><input class="mailcode" maxlength="16" placeholder="친구의 섬 코드 (예: LXVGH)" value="${this.code}" autocomplete="off" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d9d2bf;border-radius:8px;margin-bottom:10px;text-transform:uppercase" />` +
      `<div class="scap">보낼 아이템 (눌러서 보내기)</div>` +
      `<div>${items.length ? items.map(id => `<button class="scell" data-send="${id}">${info(id).emoji}</button>`).join('') : '<span class="pempty">보낼 게 없어요</span>'}</div>` +
      `<div class="pnote" style="margin-top:8px">친구가 접속 안 해도 우편함에 도착해요.</div>` +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    const codeInput = this.el.querySelector('.mailcode');
    codeInput.oninput = () => { this.code = codeInput.value; };
    this.el.querySelectorAll('[data-send]').forEach(b => b.onclick = () => {
      const c = (this.code || '').trim(); if (!c) { codeInput.focus(); return; }
      this.ctx.send(c, b.dataset.send); this._render();
    });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 픽셀 디자인 에디터: 16x16 칸에 색칠 → 깃발에 사용
export class DesignPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('design'); this.el.classList.add('designp'); this.open = false; this.color = 1; this.painting = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _hex(i) { const p = PIXEL_PALETTE[i]; return p == null ? '#ffffff' : '#' + p.toString(16).padStart(6, '0'); }
  _render() {
    const d = this.ctx.get();
    const pal = PIXEL_PALETTE.map((_, i) => `<button class="dsw${i === this.color ? ' sel' : ''}" style="background:${this._hex(i)}" data-col="${i}"></button>`).join('');
    const cells = d.map((v, i) => `<div class="dcell" style="background:${this._hex(v)}" data-i="${i}"></div>`).join('');
    this.el.innerHTML = `<div class="ptitle">🎨 디자인</div><div class="dpal">${pal}</div>` +
      `<div class="dgrid">${cells}</div>` +
      `<div class="pnote">칸을 클릭/드래그해 색칠. 깃발(제작)에 적용돼요.</div>` +
      `<button class="pall" data-clear>전체 지우기</button><button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { this.color = +b.dataset.col; this._render(); });
    const paint = (el) => { const i = +el.dataset.i; this.ctx.set(i, this.color); el.style.background = this._hex(this.color); };
    this.el.querySelectorAll('.dcell').forEach(el => {
      el.onmousedown = () => { this.painting = true; paint(el); };
      el.onmouseenter = () => { if (this.painting) paint(el); };
    });
    this.el.onmouseup = () => { this.painting = false; };
    this.el.querySelector('[data-clear]').onclick = () => { this.ctx.clear(); this._render(); };
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 캐릭터 커스텀: 몸/피부/모자 색 선택
const PALETTE = {
  body: [0xff8fb0, 0x6cc3e0, 0x84c65a, 0xffd93b, 0xa66bff, 0xff7a4d, 0x4dd0c0, 0xf06292],
  skin: [0xffd9b0, 0xf7c98f, 0xe8b98a, 0xc98a5e, 0x8d5a3c],
  hat: [0xf2e3b0, 0xe0584f, 0x4a90d9, 0xffffff, 0x9c6b3f, 0xff8fb0, 0x2b2b2b],
};
const PART_NAME = { body: '몸', skin: '피부', hat: '모자' };

export class CustomizePanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('customize'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _row(part) {
    const cur = this.ctx.get()[part];
    const sw = PALETTE[part].map(c => {
      const hex = '#' + c.toString(16).padStart(6, '0');
      return `<button class="cswatch${c === cur ? ' sel' : ''}" style="background:${hex}" data-part="${part}" data-color="${c}"></button>`;
    }).join('');
    return `<div class="scap">${PART_NAME[part]}</div><div class="crow">${sw}</div>`;
  }
  _render() {
    this.el.innerHTML = `<div class="ptitle">👕 옷장 · 커스텀</div>` +
      this._row('body') + this._row('skin') + this._row('hat') +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-part]').forEach(b =>
      b.onclick = () => { this.ctx.set(b.dataset.part, parseInt(b.dataset.color, 10)); this._render(); });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 주민: 대화(성격·친밀도 반영) + 선물
export class NpcPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('npc'); this.open = false; this.npc = null; this.line = ''; }
  show(npc) { this.npc = npc; this.ctx.arrive(npc); this.line = this.ctx.talk(npc); this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _hearts(lv) { return '❤️'.repeat(lv) + '🤍'.repeat(5 - lv); }
  _render() {
    const n = this.npc, v = n.villager, lv = this.ctx.level(n);
    const em = (id) => (info(id) || {}).emoji || '❔', nm = (id) => (info(id) || {}).name || id; // 미등록 id 방어
    if (this.ctx.say) this.ctx.say(this.line, n);   // 애니멀리즈 음성
    const gifts = this.ctx.giftables();
    const req = this.ctx.request(n);           // { item } 또는 null
    const canFulfill = req && this.ctx.hasItem(req.item);
    this.el.innerHTML =
      `<div class="ptitle">${PERSON_EMOJI[v.personality] || ''} ${n.name} <span class="pnote">${v.personality}</span></div>` +
      `<div class="lsec">친밀도 ${this._hearts(lv)}</div>` +
      `<div class="dtext" style="margin:10px 0">${this.line}</div>` +
      (req ? `<div class="reqbox">🙏 부탁: ${em(req.item)}${nm(req.item)} 필요해요` +
        (canFulfill ? ` <button class="reqbtn" data-fulfill>들어주기</button>` : ` <span class="pnote">(가진 게 없어요)</span>`) + `</div>` : '') +
      `<div style="margin:8px 0"><button class="talkbtn" data-more>💬 더 얘기하기</button></div>` +
      (gifts.length
        ? `<div class="scap">🎁 선물하기 (${v.name}은(는) ${em(v.likes)}을 좋아해요)</div><div>${gifts.map(id => `<button class="scell" data-gift="${id}">${em(id)}</button>`).join('')}</div>`
        : `<div class="pempty">선물할 만한 게 없어요</div>`) +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { this.line = this.ctx.gift(this.npc, b.dataset.gift); this._render(); });
    const more = this.el.querySelector('[data-more]'); if (more) more.onclick = () => { this.line = this.ctx.talk(this.npc); this._render(); };
    const ful = this.el.querySelector('[data-fulfill]'); if (ful) ful.onclick = () => { this.line = this.ctx.fulfill(this.npc); this._render(); };
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 보관함: 가방 ↔ 보관함 아이템 이동
export class StoragePanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('storage'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _col(obj, action, empty) {
    const keys = Object.keys(obj).filter(k => obj[k] > 0);
    if (!keys.length) return `<div class="pempty">${empty}</div>`;
    return keys.map(k => { const i = info(k); return `<button class="scell" data-${action}="${k}">${i ? i.emoji : '❔'} ${obj[k]}</button>`; }).join('');
  }
  _render() {
    const inv = this.ctx.inventory(), st = this.ctx.storage();
    this.el.innerHTML = `<div class="ptitle">📦 보관함</div>` +
      `<div class="scols"><div><div class="scap">🎒 가방 (→넣기)</div>${this._col(inv, 'dep', '비었어요')}</div>` +
      `<div><div class="scap">📦 보관함 (→꺼내기)</div>${this._col(st, 'wd', '비었어요')}</div></div>` +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => { this.ctx.deposit(b.dataset.dep); this._render(); });
    this.el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { this.ctx.withdraw(b.dataset.wd); this._render(); });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// DIY 제작대: 재료로 도구 제작
export class CraftPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('craft'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _render() {
    const inv = this.ctx.inventory();
    const rows = RECIPES.map(r => {
      const res = info(r.id);
      const can = Object.entries(r.mats).every(([m, q]) => (inv[m] || 0) >= q);
      const mats = Object.entries(r.mats).map(([m, q]) => `${info(m).emoji}${inv[m] || 0}/${q}`).join(' ');
      const owned = inv[r.id] ? ` <span class="pnote">(보유 ${inv[r.id]})</span>` : '';
      return `<div class="prow"><span>${res.emoji} ${res.name}${owned}<br><small>${mats}</small></span>
        <button data-make="${r.id}" ${can ? '' : 'disabled'}>만들기</button></div>`;
    });
    this.el.innerHTML = `<div class="ptitle">🛠️ 제작대 (DIY)</div>` + rows.join('') +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    this.el.querySelectorAll('[data-make]').forEach(b =>
      b.onclick = () => { this.ctx.craft(b.dataset.make); this._render(); });
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}

// 박물관: 물고기/곤충/화석 기증
export class MuseumPanel {
  constructor(ctx) { this.ctx = ctx; this.el = panel('museum'); this.open = false; }
  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this._render(); this.el.classList.remove('hidden'); }
  close() { this.open = false; this.el.classList.add('hidden'); }
  _render() {
    const col = this.ctx.collection(), d = col.donated;
    const total = FISH.length + BUGS.length + FOSSILS.length;
    const donatedN = d.fish.size + d.bug.size + d.fossil.size;
    const pend = this.ctx.donatable();
    this.el.innerHTML =
      `<div class="ptitle">🏛️ 박물관</div>` +
      `<div class="lsec">전시 <b>${donatedN}/${total}</b> · 🐟${d.fish.size} 🦋${d.bug.size} 🦴${d.fossil.size}</div>` +
      (pend.length
        ? `<div class="prow"><span>기증 가능: ${pend.map(id => info(id).emoji).join(' ')}</span></div><button class="pall" data-donate>기증하기 (${pend.length})</button>`
        : `<div class="pempty">기증할 새로운 것이 없어요</div>`) +
      `<button class="pclose" data-close>닫기 (Esc)</button>`;
    const db = this.el.querySelector('[data-donate]');
    if (db) db.onclick = () => { this.ctx.donate(); this._render(); };
    this.el.querySelector('[data-close]').onclick = () => this.close();
  }
}
