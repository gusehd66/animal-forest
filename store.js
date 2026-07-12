// 섬(방) 영속성: SUPABASE_URL + SUPABASE_SERVICE_KEY 있으면 Supabase에 저장/복원,
// 없으면 메모리 no-op(지금처럼 서버 재시작 시 초기화). 서버만 secret 키로 접근(RLS 우회).
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

let impl = {
  live: false,
  async loadIsland() { return null; },
  async saveIsland() {},
  async loadPlayer() { return null; },
  async savePlayer() {},
  async findPlayerIdByCode() { return null; },
  async addMail() {},
  async loadUnreadMail() { return []; },
  async markMailRead() {},
};

if (url && key) {
  try {
    const { createClient } = await import('@supabase/supabase-js'); // env 있을 때만 로드
    const sb = createClient(url, key, { auth: { persistSession: false } });
    impl = {
      live: true,
      async loadIsland(code) {
        const { data, error } = await sb.from('islands').select('*').eq('code', code).maybeSingle();
        if (error) { console.error('[store] loadIsland:', error.message); return null; }
        return data;
      },
      async saveIsland(code, d) {
        const { error } = await sb.from('islands').upsert({
          code, seed: d.seed, placed: d.placed, plants: d.plants,
          edits: d.edits, residents: d.residents, consumed: d.consumed,
          updated_at: new Date().toISOString(),
        });
        if (error) console.error('[store] saveIsland:', error.message);
      },
      async loadPlayer(id) {
        const { data, error } = await sb.from('players').select('*').eq('id', id).maybeSingle();
        if (error) { console.error('[store] loadPlayer:', error.message); return null; }
        if (!data) return null;
        return { // DB → 클라 프로필(snake→camel)
          name: data.name, appearance: data.appearance, inventory: data.inventory, money: data.money,
          collection: data.collection, friendship: data.friendship, houseItems: data.house_items,
          storage: data.storage, design: data.design, mycode: data.mycode,
        };
      },
      async savePlayer(id, d) {
        const { error } = await sb.from('players').upsert({
          id, name: d.name, appearance: d.appearance, inventory: d.inventory, money: d.money | 0,
          collection: d.collection, friendship: d.friendship, house_items: d.houseItems,
          storage: d.storage, design: d.design, mycode: d.mycode, updated_at: new Date().toISOString(),
        });
        if (error) console.error('[store] savePlayer:', error.message);
      },
      async findPlayerIdByCode(code) {
        const { data, error } = await sb.from('players').select('id').eq('mycode', code).maybeSingle();
        if (error) { console.error('[store] findByCode:', error.message); return null; }
        return data ? data.id : null;
      },
      async addMail(m) {
        const { error } = await sb.from('mail').insert({ to_id: m.to_id, from_name: m.from_name, item: m.item, note: m.note || null, read: !!m.read });
        if (error) console.error('[store] addMail:', error.message);
      },
      async loadUnreadMail(id) {
        const { data, error } = await sb.from('mail').select('*').eq('to_id', id).eq('read', false).order('created_at');
        if (error) { console.error('[store] loadMail:', error.message); return []; }
        return data || [];
      },
      async markMailRead(ids) {
        if (!ids || !ids.length) return;
        const { error } = await sb.from('mail').update({ read: true }).in('id', ids);
        if (error) console.error('[store] markMailRead:', error.message);
      },
    };
    console.log('[store] ✅ Supabase 영속성 활성화');
  } catch (e) {
    console.error('[store] Supabase 초기화 실패 → 메모리로 동작:', e.message);
  }
} else {
  console.log('[store] SUPABASE_URL/KEY 없음 → 메모리(비영속)');
}

export const store = impl;
