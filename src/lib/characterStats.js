// 实验体成长属性来源层。
//
// 「统计」栏（体力上限 / 攻击力 / 防御力 的等级成长）和「武器熟练度」栏（每级攻速、技能增幅…）
// 两份数据 er-gamedata 解包里本来就有，客户端截图录入的作用是**对账**：
//
//   - 对得上（`repoCheck: "match"`）：只留证据，不覆盖。客户端截图 Lv20 是向下取整显示的
//     （33 + 4.3*19 = 114.7 显示成 114），反推出来的每级成长精度反而不如解包原值。
//   - 对不上（`repoCheck: "conflict"`）：`scripts/ingame-capture.mjs` 会生成 `override`，
//     由这里盖到解包值上。
//
// 所以这一层平时是空转的，只在解包数据和客户端真的打架时才起作用。

import CHARACTER_DATA from '../data/characters.json';
import MASTERY_STATS from '../data/masteryStats.json';
import IN_GAME_SKILL_CAPTURE from '../data/sources/inGameSkillCapture.json';

const CAPTURED_STATS = IN_GAME_SKILL_CAPTURE.characterStats || [];
const CAPTURED_MASTERY = IN_GAME_SKILL_CAPTURE.weaponMastery || [];

const STATS_OVERRIDES = new Map(
  CAPTURED_STATS.filter((entry) => entry.override).map((entry) => [entry.heroCode, entry.override])
);
const MASTERY_OVERRIDES = new Map(
  CAPTURED_MASTERY.filter((entry) => entry.override).map((entry) => [`${entry.heroCode}|${entry.weaponType}`, entry.override])
);

/** 实验体列表：解包数据为底，客户端截图读值只在对账冲突时覆盖。 */
export const CHARACTERS = (CHARACTER_DATA.characters || []).map((character) => {
  const override = STATS_OVERRIDES.get(character.code);
  if (!override) return character;
  return {
    ...character,
    base: { ...character.base, ...override.base },
    growth: { ...character.growth, ...override.growth },
    statsSource: 'in-game-client'
  };
});

export function findCharacterByName(name) {
  return CHARACTERS.find((character) => character.name === name) || null;
}

/** 某实验体用某武器的每级熟练度成长；冲突项由客户端截图读值覆盖。 */
export function masteryStatFor(characterCode, weaponRawType) {
  const row = MASTERY_STATS.find((item) => item.characterCode === characterCode && item.type === weaponRawType) || null;
  const override = MASTERY_OVERRIDES.get(`${characterCode}|${weaponRawType}`);
  if (!override) return row;

  const options = [...(row?.options || [])];
  for (const { stat, value } of override) {
    const index = options.findIndex((option) => option.stat === stat);
    if (index >= 0) options[index] = { ...options[index], value };
    else options.push({ stat, value });
  }
  return { characterCode, type: weaponRawType, ...(row || {}), options, statsSource: 'in-game-client' };
}

/** 对账概况，供页面「官方数据」说明和排查用。 */
export const CHARACTER_STATS_CAPTURE = {
  characterStats: CAPTURED_STATS.length,
  weaponMastery: CAPTURED_MASTERY.length,
  conflicts: [...CAPTURED_STATS, ...CAPTURED_MASTERY]
    .filter((entry) => entry.repoCheck === 'conflict')
    .map((entry) => entry.id)
};
