# 🏝️ Grid Island — 그리드 기반 3D 섬 MVP

내부는 **그리드/셀 데이터**로 단순하게, 화면은 **오토타일 + 절벽 립/AO**로 자연스럽게.
Three.js, 빌드 없음(CDN import map). 추후 Socket.IO 멀티 확장 대비 구조.

## 실행
```
node serve.js        # http://localhost:8720
```
브라우저에서 열면 됨. 이동: **WASD / 방향키**, 🎲 버튼으로 새 섬 생성(시드).

## 설계 원칙
- **맵 = 순수 데이터**(`Cell` 그리드, JSON 직렬화 가능). 렌더는 `map → scene` 순수 함수.
- **셀은 평평**(램프만 경사) → 충돌·표면높이가 렌더와 정확히 일치(파묻힘 없음).
- **배치는 시드 기반**(재현·멀티에서 모든 클라 동일) — Phase 2에서 사용.
- 메시는 **셀별 생성 대신 병합**(draw call 최소화).

## 구조
```
src/
  config.js          상수 + grid↔world 변환 + 방향 테이블
  map/rng.js         시드 RNG(mulberry32)
  map/mapData.js     Cell 그리드 + 시드 섬 생성 + walkable/표면높이
  map/autotile.js    이웃 비트마스크 + 절벽면 자동 선택(방향=회전)
  render/materials.js 잔디/절벽/AO 텍스처·재질
  render/terrain.js  셀 top 병합 메시(grass/sand) + 바다 평면
  render/cliffs.js   height차 절벽 옆면 + 둥근 잔디 립 + 바닥 AO
  player.js          저폴리 캐릭터 + 연속이동 + 그리드 충돌
  camera.js          약한 Perspective 추적 카메라
  input.js           키보드
  main.js            부트스트랩/루프/조명
```

## Cell 데이터
`{ gx, gz, height(레벨 정수), terrain('grass'|'sand'|'water'), walkable, ramp, rampFrom/To/Dir }`

## 오토타일
- **지형 경계**: `edgeMask/mask8`(이웃 비트마스크) — Phase 3에서 grass/water 엣지 타일에 사용.
- **절벽 옆면**: `cliffFaces` — 이웃과 height 차가 나는 방향마다 옆면 1장(방향=회전). 램프 방향은 제외.

## Phase 현황
- **Phase 1 (완료)**: 시드 섬(잔디/모래/물/고원/램프), 오토타일 절벽(옆면+립+AO), 플레이어 이동·그리드 충돌, 추적 카메라, 새 섬 재생성.
- **Phase 2 (완료)**: 규칙기반 시드 배치(나무10 2칸간격·돌5 절벽/물가가중·꽃 군집·풀 장식) + solid 충돌 + NPC 1명(홈 반경 배회) + 근접 대화(Space).
- **Phase 3 (완료)**: 물결 애니메이션(분할 평면 정점 파동), 길(path) 타일, **45° 둥근 모서리**(고원 볼록코너 chamfer — 상단 폴리곤 + 대각 절벽면 + 립), 장식.
- **싱글 다듬기 (완료)**: 채집(나무 흔들기→🍎/돌 캐기→🪨, 쿨다운 / 꽃 줍기→🌸, 월드에서 제거) + 인벤토리 HUD + 획득 토스트 + 상호작용 프롬프트(대상별 문구) + 걷기 bob 애니메이션.
- **P5 시간·계절·날씨 (완료)**: 낮밤 하늘/조명 사이클, 4계절(잔디·나뭇잎·립·물 색 변화), 날씨(맑음/비/눈, 날짜 시드로 결정), 비·눈 파티클, 시계 HUD, ⏩빨리감기. `src/time.js`(GameClock/applySky/WeatherFX).
- **P4 저장 (완료)**: localStorage(`grid-island-save-v1`)로 시드·시간·위치·인벤토리·주운 꽃 유지. 3초 자동 + 채집 즉시 + 탭 닫기/숨김 저장. `src/save.js`.
- **P6 생활시스템 1 (완료)**: 화폐(벨), 낚시(물가 Space→시즌/시간별 물고기), 곤충 채집(잔디 스폰→근처 Space), 상점(가판대→판매), 도감(🐟/🦋 수집). `src/data/content.js`·`bugs.js`·`panels.js`. 화폐·도감 저장 포함.
- **P6 생활시스템 2 (완료)**: 화석 발굴지(삽 필요), DIY 제작대(재료→도구: 삽/그물/낚싯대), 박물관(물고기/곤충/화석 기증), 나무에서 나무(wood) 획득. `src/fossils.js`, `panels.CraftPanel/MuseumPanel`, 도감에 화석·기증(✓) 추가.
- **P7 꾸미기 1 (완료)**: 가구 그리드 배치 — 제작(의자/테이블/가로등/모닥불/울타리) → 배치 바에서 선택 → 앞 칸에 고스트 미리보기 → Space로 놓기(solid=이동 막음) → 근처 Space로 회수. 배치 저장. `src/furniture.js`, `map.blockedAtWorld`에 placed 반영.
- **P7 꾸미기 2 (완료)**: 원예(씨앗 심기→날짜 지나며 새싹/봉오리/꽃 성장→수확 시 꽃+씨앗), 보관함(가방↔보관함 이동, chest 제작·배치·열기). `src/plants.js`, `panels.StoragePanel`. 씨앗은 꽃 줍기 50% 드롭.
- **P7 꾸미기 3 (완료)**: 내 집 입장/퇴장 — 문 앞 Space로 실내 씬(바닥·벽·보관함·조명) 진입, 방 안 자유 이동(경계 clamp), 출구 매트에서 퇴장. 실내 보관함은 밖 보관함과 동일 저장 공유. `enterHouse/exitHouse` + `player.indoor`.
- **P8 주민심화 (완료)**: 주민 3명(성격 명랑/무뚝뚝/느긋, 외형·좋아하는 선물 다름) + 친밀도(하트 5단계) + 선물(좋아하는 것 +3/그 외 +1, 반응 대사) + 친밀도별 인사말. `src/data/villagers.js`, `panels.NpcPanel`. 친밀도 저장.
- **P9 캐릭터 커스텀 (완료)**: 옷장 패널에서 몸/피부/모자 색 선택 → 캐릭터에 즉시 반영 + 저장. `panels.CustomizePanel`, `player.setAppearance`.
- **P10 멀티플레이 (완료)**: Node+Socket.IO 서버(`server.js`, 정적+소켓)가 섬 시드 소유→접속 시 내려주기, 원격 플레이어 접속/이동/퇴장 동기화 + 보간 + 이름표/외형. 🎲=서버 재시드(전체 브로드캐스트). 오프라인이면 싱글 폴백. `src/net.js`, `src/remotePlayers.js`.
- **P11 소셜/동기화 (완료)**: 채팅(Enter로 입력, 로그 + 머리 위 말풍선) + 가구 배치 실시간 공유(서버가 배치 상태 소유, 신규 접속자도 수신). `src/net.js`·`remotePlayers.attachBubble`, 서버 place/pickup/chat.

## 채팅·배치 공유 (P11)
서버 `placed[]` 소유 + `place/pickup/chat` 이벤트. 클라: 배치/회수 시 emit → 서버가 다른 클라에 broadcast, welcome에 `placed` 포함. 채팅=Enter로 `#chatinput`(입력 중 이동 정지), 전송 시 전체 브로드캐스트 → `#chatlog` + 말풍선. ## 깊은 동기화 (P12)
서버가 **시각(day/hour, 1초마다 진행·2.5초마다 broadcast)**, **채집(꽃/곤충/화석 consumed set)**, **식물(plants, 심은날 기준)** 소유. 클라: 채집/심기/수확 시 emit → 서버 broadcast + welcome에 전체 상태 포함(신규 접속자도 동일). 식물 성장=`clock2.day - 심은날`로 계산해 서버 시각과 자동 동기. **아직 로컬**: NPC 위치·나무/돌 쿨다운(무해).

## 픽셀 디자인 · 우편 (P13-1)
- **디자인 에디터(🎨)**: 16×16 팔레트 그리드에 색칠 → `design` 저장. **디자인 깃발** 가구(제작)에 그 무늬가 텍스처로 구워짐. 깃발 배치 시 디자인을 함께 전송해 **다른 사람도 같은 그림**을 봄. `src/design.js`, `furniture.flag`.
- **우편(📬)**: 접속 중인 다른 플레이어를 골라 가방 아이템을 보냄 → 상대 가방에 즉시 도착 + 알림. (온라인 대상 한정)

## 초대코드 / 방 (P14) — 내 섬 + 방문
로비(닉네임 + [🏠 내 섬 입장] / [✈️ 초대코드로 방문]). 서버가 **방(room)별 상태**(seed=코드 해시·players·placed·plants·consumed) 소유, 시각만 전역 공유. 내 코드는 localStorage 저장 → 재접속·친구 방문에 사용. 다른 방은 격리(서로 안 보임), 같은 코드면 같은 섬에서 함께(채집·배치·채팅 방 단위 동기화). HUD에 방/코드 + 🏠/✈️ 버튼. **animal-forest의 내 섬+방문 그대로.** (메모리 방식: 방은 접속자 있을 때만 유지.)

**🏝️ animal-forest 핵심 기능 전부 grid-island에 이식 완료.**

## 실행(멀티) & 구조
```
npm install    # socket.io (최초 1회)
npm start      # = node server.js, http://localhost:8720
```
`server.js`: 정적 서빙 + Socket.IO. 상태: 서버 시드 + `players`(id·이름·외형·위치). 이벤트: welcome/join/move/regen/reseed/playerJoined/playerMoved/playerLeft. 클라는 `net.js`로 연결, welcome에서 시드 받아 `startGame` → `buildWorld`. **알려진 한계**: 채집·배치물·NPC·시간은 아직 각 클라 로컬(플레이어 위치만 동기화). 저장(localStorage)은 개인용, 섬 의존 데이터는 시드 일치 시만 복원.

## 커스텀 (P9)
`appearance{body,skin,hat}` 상태 → `player.setAppearance`로 메시 색 적용. `CustomizePanel`(👕 옷장 버튼)에서 팔레트 선택 시 즉시 적용+저장. 스폰/새로고침 시 복원.

## 주민 (P8)
`data/villagers.js`(VILLAGERS: id·이름·성격·색·likes·친밀도별 greet). `npc.js`는 villager로 파라미터화(색/귀). main.js: `npcs` 배열로 3명 스폰, `friendship{id:점수}`, `NpcPanel`(성격·하트·인사·선물버튼), 선물=liked +3/기타 +1, 친밀도 저장/복원. (단일 dialogue 제거→NpcPanel)

## 집 실내 (P7-3)
`makeHouse`(입장 가능 집) 스폰 허브에 배치. `buildInterior`(방=바닥+벽+출구매트+보관함+PointLight). `enterHouse`=indoor 플래그+실외 그룹 hide+실내 show+실내 조명/배경+플레이어 방 안 배치, `exitHouse`=역. `player.indoor`면 이동은 방 경계(±3.4) clamp·y=0. 실내에선 `applySky`/날씨 스킵.

## 원예·보관함 (P7-2)
씨앗을 배치 바에서 선택 → 잔디에 심기(`plants` 리스트, cell.plant). 하루 지날 때마다 stage 0→2 성장(`growPlants`, 루프에서 day 변화 감지), 다 자란 꽃은 Space로 수확(🌸×2+씨앗). 보관함(chest)은 배치 후 Space로 `StoragePanel` 열어 가방↔보관함 이동. 식물·보관함 저장/복원.

## 가구 배치 (P7-1)
`content.FURNITURE`(제작 가능, solid) + `RECIPES`. `furniture.js` 저폴리 메시/고스트. main.js: `placeMode`(선택 가구+고스트), 앞 칸(`frontCell`)에 고스트 표시, `canPlace`(walkable·비어있음·구조물 아님) 확인 후 `placeFurniture`(cell.placed 기록), Space로 회수. `#placebar` UI. `snapshot.placed`로 저장/복원.

## 생활시스템 (P6-1)
데이터 `src/data/content.js`(MATERIALS/FISH/BUGS + info/priceOf/availableFish/availableBugs/pickWeighted). 낚시=물가 인접 Space→1.2s 후 시즌·낮밤 가중 랜덤 어획. 곤충=`bugs.js`로 시드 스폰(호버), 근처 Space로 채집. 상점=스폰 근처 가판대, Space로 `panels.ShopPanel`(개별/전부 판매). 도감=`panels.LogPanel`(📖/L), 잡은 종 표시. 벨·도감·인벤 저장.

## 상호작용/채집 (싱글 다듬기)
Space = (대화 중)다음 → (NPC 근처)대화 → (나무/꽃/돌 근처)채집. `main.js` `nearestInteract()`가 대상 판정, `inventory.js`가 HUD/토스트. 나무·돌은 쿨다운 후 반복, 꽃은 1회(제거). 흔들기 애니메이션은 `mesh.userData.shake`를 루프에서 감쇠.

## 45° 둥근 모서리 (Phase 3)
`autotile.convexCorners`가 "두 직교 이웃이 모두 낮은" 볼록코너를 찾음 → `terrain.js`가 상단 쿼드를 코너 깎은 폴리곤(부채꼴)으로, `cliffs.js`가 직선 벽을 코너에서 `C`만큼 줄이고 그 사이에 45° 대각 벽+립+AO를 채움. **충돌은 그리드 셀 기준 그대로**(코너 깎기는 시각용) — 자연스러운 곡선 실루엣.

## 오브젝트/상호작용 (Phase 2)
- `src/map/placement.js`: 시드 RNG로 `cell.object` 기록 + `map.objects` 목록. 나무/돌=solid(충돌), 꽃/풀=장식. 램프·스폰 인접 금지.
- `src/render/objects.js`: 저폴리 나무/돌/꽃/풀 메시.
- `src/npc.js` + `src/dialogue.js`: NPC 배회 + Space 근접 대화(줄 순환→닫힘).
