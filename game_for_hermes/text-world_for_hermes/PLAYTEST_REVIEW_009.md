# Playtest review — Spec 009 UO build/craft/magic (2026-09-11)

Tester: 봇순이 (API play on branch `cursor/uo-building-crafting-magic-009-2d25`, local uvicorn 0.9.1)
Method: register → explore/combat → build_* → craft_* → research/cast. Materials partly SQL-injected after natural gather proved too RNG-heavy for a short session.

## Verdict
방향은 맞다. Hermes가 `/act`만으로 건설·제작·연구까지 갈 수 있는 뼈대는 생겼다. 다만 v1이 **프롭 스폰 중심**이라 UO의 “집/성/계단이 공간이 된다” 느낌이 아직 약하고, 요리·연금은 **서버 500**으로 막혀 있다. 전투·단조·주문 연구(부분)는 플레이 가능.

## What worked
- 전투 루프: `explore` → `attack`(반격 포함) → 처치 → `loot`/`search` 힌트. 템포 괜찮음.
- `build_house` / `build_forge` / `build_castle` / `build_stairs`: 재료 충족 시 200, 구조물 id 반환.
- `recipes` + `craft_smith` (`smith_sword`, `smith_helm`): 대장간 가구 근처에서 투구 제작 성공, `equip`으로 ATK 반영.
- `research_spell` ice_shard 3스택 완료 후 `cast ice_shard` 실제 피해 + 이벤트 로그.
- `/verbs`에 신규 건설·제작 동사가 노출됨 (총 119개 전후).

## Bugs / broken in session
1. **`craft_cook` / `craft_alchemy` → HTTP 500**  
   원인: `crud.spawn_ground_item`이 `drop["slot"]` 필수인데, 요리·물약 레시피 result에 `slot`이 없음 → KeyError.  
   재현: `cook_stew`, `alchemy_heal`, `alchemy_buff_atk` 모두 500.
2. **`scripts/smoke_009_building_crafting_magic.py` 실패**  
   register/API 전에 `charge()`가 `text_world.db`를 열어 `no such table: objects`. 또한 서버 `TEXT_WORLD_DB`와 스모크 DB 경로가 어긋나기 쉬움.
3. **계단/집/성 Place 미연결**  
   코드 주석 그대로 v1은 구조물만 스폰. `build_stairs` 후에도 `place_id`/`exits` 변화 없음. 요약 문구의 “층간 연결”과 실제 불일치.
4. **`build_palisade` / `build_anvil` 재료량 UX**  
   실패 메시지는 명확하나, 직전 건설과 재료 공유 시 카운트 미스가 잦음. (palisade 4 wood+2 stone, anvil 2 ingot)
5. **연구 재료 소모 vs 복수 주문**  
   ice_shard 3회에 book/bone 소진 → lightning/shield는 즉시 400. 의도일 수 있으나 튜토리얼/드롭 없이는 연구 루프가 끊김.
6. **`teleport`/`shield` cast 400 (미습득)**  
   연구 안 한 주문은 올바르게 거절. 다만 shield를 연구할 재료가 부족해 세션에서 검증 못 함.
7. **코어 동사 discoverability**  
   `look`/`explore`/`attack`/`cast`는 동작하지만 `/verbs` 목록에는 없음(별도 라우터). Hermes가 verbs만 보면 전투 루프를 못 찾음.

## Design gaps vs Ultima Online / Archmage goal
- 집은 **장식 오브젝트**이지 출입·소유·잠금·인테리어 방이 아님.
- 목책/성벽이 전투/이동에 미치는 효과 없음 (커버, 통과 차단 등).
- 대장간은 forge 근접 체크만 있고, 스킬 숙련·실패·품질 롤 없음.
- 요리 heal이 `bonus_atk` 필드에 들어 있는 등 **의미 필드 남용** — Hermes/문서 혼란.
- 마법 연구는 진행도 게이지는 좋지만, 시연(데모) 전용 플로우·실패/폭주/시약 변주가 Archmage 느낌까지는 못 감.
- 자연 채집만으로 레시피 재료(bottle, raw_meat, book…)를 안정적으로 못 구함 → 에이전트 루프 좌절.

## Priority improvements
P0
- `spawn_ground_item` / `_craft_recipe`: `slot` optional (food/potion용 `slot=None` + 기본 hp)
- smoke_009: register 후 charge, DB 경로를 서버와 동일 env로
- `/verbs`에 look/explore/attack/cast/loot/equip 등 코어 액션 포함 또는 섹션 분리 문서화

P1
- `build_stairs`/`build_house`/`build_castle`: 실제 Place 생성 + exits 연결 (`enter`/`go`)
- 구조물 태그 효과: palisade/wall이 같은 place 전투 수정 또는 이동 비용
- 재료 드롭 테이블: dig/chop/monster loot에 bottle/seed/raw_meat/book 확률 명시

P2
- 연구: 주문별 레시피 표시, 재료 부족 시 다음 연구 재료 힌트, 시연 모드(`demonstrate`)
- 제작 품질/내구, 집 deed/소유권, 성 멀티룸
- HERMES_API_MANUAL에 009 루프 예시 (gather → build_forge → craft_smith → research → cast)

## Session notes (raw)
- API 0.9.1, DB `text_world_playtest.db`
- build_house/forge/castle/stairs OK; palisade/anvil material short once
- craft_smith sword+helm OK; cook/alchemy 500
- ice_shard research 1/3→3/3 then cast OK; shield/teleport not learned
- Final: house+castle+forge props littering f1_gate; place still f1_gate