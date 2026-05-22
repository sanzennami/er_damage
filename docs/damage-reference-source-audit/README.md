# Damage Reference Source Audit

Generated at: 2026-05-21T23:33:03.111Z

This audit starts with the newest git-updated JSON files. SkillExtension.json is kept last as a historical reference. Known old-character damage signatures are extracted from SkillExtension, then searched in every other JSON file to see whether another current table carries the same damage parameters under different field names.

## Source Order

| file | latest git commit date | SkillExtension |
| --- | --- | --- |
| #MatchingQueueTier의 시즌 안정화.json | 2026-05-21T12:00:17+09:00 | no |
| Achievement.json | 2026-05-21T12:00:17+09:00 | no |
| Achievements.json | 2026-05-21T12:00:17+09:00 | no |
| ActionCost_Light.json | 2026-05-21T12:00:17+09:00 | no |
| ActionCost.json | 2026-05-21T12:00:17+09:00 | no |
| ArcheTypeIdealStatValue.json | 2026-05-21T12:00:17+09:00 | no |
| ArchiveCharacterContentOpen.json | 2026-05-21T12:00:17+09:00 | no |
| ArchiveEpisode.json | 2026-05-21T12:00:17+09:00 | no |
| ArchiveScenario.json | 2026-05-21T12:00:17+09:00 | no |
| Area.json | 2026-05-21T12:00:17+09:00 | no |
| AreaAttributes_V2.json | 2026-05-21T12:00:17+09:00 | no |
| AreaAttributes.json | 2026-05-21T12:00:17+09:00 | no |
| AreaSound.json | 2026-05-21T12:00:17+09:00 | no |
| AssetTrade.json | 2026-05-21T12:00:17+09:00 | no |
| AttackTypeTable.json | 2026-05-21T12:00:17+09:00 | no |
| Attendance.json | 2026-05-21T12:00:17+09:00 | no |
| AttendRewardList.json | 2026-05-21T12:00:17+09:00 | no |
| AutoExchangeToken.json | 2026-05-21T12:00:17+09:00 | no |
| BattlefieldArea.json | 2026-05-21T12:00:17+09:00 | no |
| BattlePassMission.json | 2026-05-21T12:00:17+09:00 | no |

## Reference Characters

| reference extension | group | skillId | known damage signatures | related sequence hits outside SkillExtension | global sequence hits outside SkillExtension |
| --- | --- | --- | --- | --- | --- |
| AyaActive1Data | 1002200 | AyaActive1 | DamageByLevel=[20,60,100,140,180] | none | none |
| FioraActive1Data | 1003200 | FioraActive1 | DamageByLevel=[75,150,225,300,375] | none | none |
| JackieActive1Data | 1001200 | JackieActive1 | DamageByLevel=[20,40,60,80,100]<br>DamageByLevel_2=[30,50,70,90,110]<br>DFS_DamageByLevel=[80,110,140,170,200] | none | none |
| HyunwooActive1Data | 1007200 | HyunwooActive1 | DamageByLevel=[100,150,200,250,300] | none | none |
| YukiActive3Data | 1011400 | YukiActive3 | SkillDamage=[70,130,190,250,310] | none | none |
| NadineActive2Data | - | - | DamageByLevel=[100,170,240,310,380]<br>DamageByLevel_2=[100,140,180,220,260] | none | none |

## Target Groups

| group | skillId | file | latest git commit date | related rows | exact value hits | damage-like field rows |
| --- | --- | --- | --- | --- | --- | --- |
| 1079200 | JustynaActive1_1 | CharacterVoiceRandomCount.json | 2026-05-21T12:00:17+09:00 | 1 | - | - |
| 1079200 | JustynaActive1_1 | EffectAndSound.json | 2026-05-21T12:00:17+09:00 | 2 | - | - |
| 1079200 | JustynaActive1_1 | Skill.json | 2026-05-21T12:00:17+09:00 | 5 | 1079201: cost=50<br>1079202: cost=50<br>1079203: cost=50<br>1079204: cost=50<br>1079205: cost=50 | - |
| 1079200 | JustynaActive1_1 | SkillGroup.json | 2026-05-21T12:00:17+09:00 | 2 | 1079200: castingTime1=0.4<br>1079210: castingTime1=0.7, sequenceCooldown=0.4 | - |
| 1047200 | LauraActive1_1 | CharacterSkillVideos.json | 2026-05-21T12:00:17+09:00 | 1 | - | - |
| 1047200 | LauraActive1_1 | CharacterStateGroup.json | 2026-05-21T12:00:17+09:00 | 2 | - | 1047210\|1047500 |
| 1047200 | LauraActive1_1 | CharacterVoiceRandomCount.json | 2026-05-21T12:00:17+09:00 | 1 | - | - |
| 1047200 | LauraActive1_1 | EffectAndSound.json | 2026-05-21T12:00:17+09:00 | 5 | - | - |
| 1047200 | LauraActive1_1 | Skill_Indicator.json | 2026-05-21T12:00:17+09:00 | 5 | - | - |
| 1047200 | LauraActive1_1 | Skill.json | 2026-05-21T12:00:17+09:00 | 5 | - | - |
| 1047200 | LauraActive1_1 | SkillGroup.json | 2026-05-21T12:00:17+09:00 | 2 | - | - |
