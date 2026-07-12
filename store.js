// 섬(방) 영속성: SUPABASE_URL + SUPABASE_SERVICE_KEY 있으면 Supabase에 저장/복원,
// 없으면 메모리 no-op(지금처럼 서버 재시작 시 초기화). 서버만 secret 키로 접근(RLS 우회).
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

let impl = {
  live: false,
  async loadIsland() { return null; },
  async saveIsland() {},
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
    };
    console.log('[store] ✅ Supabase 영속성 활성화');
  } catch (e) {
    console.error('[store] Supabase 초기화 실패 → 메모리로 동작:', e.message);
  }
} else {
  console.log('[store] SUPABASE_URL/KEY 없음 → 메모리(비영속)');
}

export const store = impl;
