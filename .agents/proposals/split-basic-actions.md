# 提案: `basicActions.ts` の責務分割

## 優先度: 中

## 現状

`app/store/game/basicActions.ts` が約300行あり、以下の多岐にわたる責務を1ファイルで持っている:

- 地図データの読み込み (`setRegions`, `setAdjacency`, `setBorderMidpoints`)
- 地域・ユニットの選択 (`setSelectedRegion`, `setSelectedUnitRegion`)
- 師団の複数選択 (`createDivisionSelectionActions` から展開)
- 軍団師団の一括選択 (`selectDivisionsInArmyGroup`)
- 戦闘中ユニットの選択 (`setSelectedMovementId`)
- UI状態の制御 (`setIsProductionModalOpen`, `setSelectedCountryId`, `setIsCountrySidebarOpen`, `setSwitchModeActive`)
- AIの有効化/無効化 (`setPlayerAIEnabled`)
- 通知の管理 (`dismissNotification`)
- 画面遷移 (`navigateToScreen`)
- ゲームの初期化 (`startNewGame`)
- 国の選択 (`selectCountry`)
- 再生制御 (`togglePlay`, `setGameSpeed`)
- ミッション (`claimMission`, `openMissions`)
- セーブ/ロード (`saveGame`, `loadGame`)
- 地図モード (`setMapMode`)
- セントロイドの初期化 (`initializeCentroids`)

## 問題点

1. **命名と実態の不一致**: "basic" という名前が示すよりも遥かに大きな責任範囲を持っている。
2. **変更の衝突**: 異なる関心事（例: セーブ/ロードと画面遷移）が同じファイルにあるため、複数の開発者が同時に編集するとコンフリクトしやすい。
3. **発見可能性**: 特定のアクションを探したとき、ファイルが大きすぎるとどこに何があるか分かりにくい。

## 提案

以下のファイルに分割する:

| ファイル | 責務 | 含まれる関数 |
|---------|------|-------------|
| `mapDataActions.ts` | 地図データの読み込み・初期化 | `setRegions`, `setAdjacency`, `setBorderMidpoints`, `initializeCentroids` |
| `selectionActions.ts` | 地域・ユニット・師団の選択 | `setSelectedRegion`, `setSelectedUnitRegion`, `selectDivisionsInRegion`, `selectDivisionsInArmyGroup`, `setSelectedMovementId`, `setSelectedCombatId` + division selection actions |
| `uiStateActions.ts` | UI状態の制御 | `setIsProductionModalOpen`, `setIsCountrySidebarOpen`, `setSwitchModeActive`, `dismissNotification`, `setMapMode` |
| `navigationActions.ts` | 画面遷移 | `navigateToScreen`, `openMissions` |
| `gameControlActions.ts` | 再生制御・AI | `togglePlay`, `setGameSpeed`, `setPlayerAIEnabled` |
| `countrySelectionActions.ts` | プレイヤー国の選択 | `selectCountry` + `getAIControlledCountries` |
| `saveLoadActions.ts` | セーブ/ロード | `saveGame`, `loadGame`, `rehydrateDivisions` |
| `missionActions.ts` | ミッション操作 | `claimMission`, `openMissions` |

分割後は `index.ts` でまとめてエクスポートし、`createBasicActions` の呼び出し側は変更しない。

## メリット

- 各ファイルが50行前後に収まり、目的が明確になる
- コンフリクトのリスクが下がる
- 新しいアクションの追加先が明確になる

## 注意

- 分割は既存の公開API（`createBasicActions` の戻り値）を変えてはいけない
- 既存のテストはすべて通ることを確認する
