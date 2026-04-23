# Architecture Improvement 01: `domain` と `store` の二重実装を解消する

## 要旨

現状のコードベースでは、ゲームルールの一部が `app/domain/game` と `app/store/game` の両方にまたがって存在している。

特に次の構造が混在している。

- `domain` にある pure implementation
- `store` にある旧来の命令型実装
- `store` にある `domain` への薄い adapter
- `store` にある backward compatibility のための re-export

この状態は、「どこが正本か」がファイル単位で揺れるため、保守性を下げる。

## 何が問題か

### 1. 同じ責務が複数レイヤに分散している

以下のように、純粋ロジックの移行が途中で止まっている。

- [app/store/game/unitActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/unitActions.ts:29)
- [app/store/game/armyGroupActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/armyGroupActions.ts:18)
- [app/store/game/armyGroupAttack.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/armyGroupAttack.ts:1)
- [app/store/game/missionRewards.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/missionRewards.ts:1)

一方で tick 本体はすでに `domain` へ寄せ始めている。

- [app/domain/game/engine/advanceSimulation.ts](/home/ysikishokurin/russian-civil-war-simulator/app/domain/game/engine/advanceSimulation.ts:44)
- [app/store/game/tickActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/tickActions.ts:12)

結果として、次の判断が常に必要になる。

- この処理は `domain` 側を見るべきか
- まだ `store` 側に残っているのか
- `store` 側は正規実装なのか adapter なのか

### 2. レイヤ責務が読み取りにくい

`store` は本来 state container と adapter に留めたいが、現状は gameplay mutation を大量に持っている。

例:

- 移動命令の解決
- 交戦開始
- 経路探索
- 軍集団の再編
- 初期ユニット配置

これらが `store` に残ると、`domain` を導入した効果が限定的になる。

### 3. 移行コストが継続的に増える

二重実装が残った状態では、新機能追加やバグ修正のたびに次の選択を迫られる。

- 旧 `store` 実装に足す
- `domain` に実装して adapter を増やす
- 両方を触る

この迷い自体が設計コストであり、長期的にはコード量以上に効く。

## 現在の状態整理

### `domain` に寄っているもの

- tick engine
- 各種 tick helper の多く
- mission reward の本体実装
- army group attack / defend の pure implementation

### `store` に残っているもの

- `moveUnits` を中心とした command 実装
- country select / new game / mission claim の orchestration
- theater 更新の後処理
- player 操作由来の mutation の大半

### `store` にある移行中の痕跡

- thin adapter
- re-export
- `EngineSimulationState` への変換コード

## 目指す形

### 原則

ゲームルールの正本は `app/domain/game` に 1 つだけ置く。

`app/store/game` は次だけを行う。

- 現在 state の取得
- command の構築
- `domain` 呼び出し
- 結果の反映
- persistence 連携

### レイヤごとの責務

`domain`

- 状態遷移
- ルール判定
- command 適用
- event 生成

`application`

- UI や automation API からの要求をユースケースに変換
- 複数 command の orchestrate

`store`

- state 保持
- selector
- hydration / persistence
- domain result の反映

## 推奨方針

### 1. `store` 内の gameplay mutation を command 化する

最優先は [app/store/game/unitActions.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/unitActions.ts:29) のような大きい action を `domain` の command handler に移すこと。

候補:

- `moveUnits`
- `cancelMovement`
- `redirectMovement`
- `claimMission`
- `selectCountry`
- `createArmyGroup`
- `assignTheaterToGroup`

### 2. `store` の adapter を薄く保つ

たとえば [app/store/game/armyGroupAttack.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/armyGroupAttack.ts:10) のような adapter は許容できるが、ここにロジックが戻り始めると再び二重化する。

adapter の責務は次で止めるべきである。

1. state を `domain` 入力型へ変換する
2. `domain` を呼ぶ
3. 戻り値を store patch に変換する

### 3. backward compatibility 用の re-export は期限付きにする

[app/store/game/missionRewards.ts](/home/ysikishokurin/russian-civil-war-simulator/app/store/game/missionRewards.ts:1) のような re-export は移行期には有効だが、恒久化すると依存境界が曖昧なまま残る。

以下を明示するとよい。

- どの import 経路を正式 API とするか
- いつ旧 import を削除するか
- テストをどこへ寄せるか

### 4. `domain` の public API を絞る

呼び出し口が散らばると、移行後も `store` 側で勝手にロジックを持ちやすい。

最低限、次のような入口へ集約したい。

- `advanceSimulation(state, deps)`
- `applyGameCommand(state, command, deps)`

## 実施順

### Phase 1

`store` 内で純粋ロジックを多く持つ command を洗い出す。

最優先:

- `unitActions.ts`
- `armyGroupActions.ts`
- `basicActions.ts` のうち gameplay mutation を含む部分

### Phase 2

`domain` 側に command handler を追加する。

例:

```ts
type GameCommand =
  | { type: 'MOVE_UNITS'; fromRegion: string; toRegion: string; divisionIds?: string[] }
  | { type: 'CANCEL_MOVEMENT'; movementId: string }
  | { type: 'REDIRECT_MOVEMENT'; movementId: string; newDestinationRegionId: string }
  | { type: 'CLAIM_MISSION'; missionId: string };
```

### Phase 3

`store` action を adapter 化する。

例:

1. state を読む
2. command を組み立てる
3. `applyGameCommand()` を呼ぶ
4. patch を反映する

### Phase 4

旧実装と re-export を削除する。

削除対象候補:

- `store` 側の gameplay-heavy 実装
- 暫定 adapter でしか使わない bridge
- 互換 import のためだけに残っているファイル

## 完了条件

次を満たしたら、この改善は完了とみなせる。

- gameplay rule は `app/domain/game/**` にのみ存在する
- `app/store/game/**` は state adapter と persistence に限定される
- `store` 側に 200 行超の gameplay-heavy action が残っていない
- command 系テストが `store` を介さず `domain` へ直接書ける
- 新機能追加時に「`store` と `domain` のどちらへ書くか」で迷わない

## 関連文書

この文書は「二重実装の解消」に絞ったものであり、より広い論点である `domain` の store 非依存化については次を参照。

- [DOMAIN-STORE-INDEPENDENCE.md](/home/ysikishokurin/russian-civil-war-simulator/DOMAIN-STORE-INDEPENDENCE.md)
