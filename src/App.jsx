import React, { useMemo, useState } from 'react';

const EQUIPMENT = [
  { type: '武器', name: '月水晶', ap: 88, cd: 10, effect: '诅咒', quality: '金' },
  { type: '武器', name: '女帝', ap: 93, cd: 15, effect: '寒波', quality: '金' },
  { type: '武器', name: '隐遁者', ap: 70, cd: 10, effect: '诅咒', quality: '紫' },
  { type: '武器', name: '五芒星', ap: 68, cd: 15, quality: '紫' },
  { type: '武器', name: '命运之轮', ap: 66, cd: 10, effect: '减疗', quality: '紫' },
  { type: '武器', name: '炼狱', ap: 112, cd: 15, penPct: 0.1, effect: '吸血6%', quality: '红' },
  { type: '武器', name: '炼狱绯红', ap: 100, cd: 15, penPct: 0.07, effect: '诅咒', quality: '红' },
  { type: '武器', name: '炼狱晓色', ap: 110, cd: 15, penPct: 0.08, effect: '寒波', quality: '红' },
  { type: '武器', name: '阿戈斯之眼', ap: 90, effect: '破裂', quality: '金' },
  { type: '衣服', name: '私人订制', ap: 125, cd: 10, effect: '炽燃', quality: '金' },
  { type: '衣服', name: '神职法衣', ap: 130, apPct: 0.25, uniqueApPct: true, quality: '金' },
  { type: '衣服', name: '优雅礼服', ap: 120, cd: 20, effect: '凝聚', quality: '金' },
  { type: '衣服', name: '血色斗篷', ap: 122, effect: '腐化', quality: '金' },
  { type: '衣服', name: '日轮之铠', ap: 135, cd: 10, effect: '减疗', quality: '金' },
  { type: '衣服', name: '异端审判官', ap: 138, cd: 15, effect: '刽子手', quality: '金' },
  { type: '衣服', name: '比基尼', ap: 135, effect: '减疗', quality: '红' },
  { type: '衣服', name: '红心女王', ap: 135, cd: 25, effect: '凝聚,减疗', quality: '红' },
  { type: '衣服', name: '指挥官战甲', ap: 126, quality: '紫' },
  { type: '衣服', name: '御史衣', ap: 112, cd: 10, quality: '紫' },
  { type: '衣服', name: '大祭司长袍', ap: 100, cd: 20, quality: '紫' },
  { type: '衣服', name: '白大褂', ap: 100, cd: 10, quality: '紫' },
  { type: '衣服', name: '主教长袍', ap: 124, effect: '减疗', quality: '紫' },
  { type: '衣服', name: '幽冥战甲', ap: 100, effect: '疾风', quality: '紫' },
  { type: '头部', name: '幽灵面具', ap: 80, apPct: 0.25, uniqueApPct: true, quality: '金' },
  { type: '头部', name: '先知头巾', ap: 80, cd: 20, effect: '减疗', quality: '金' },
  { type: '头部', name: '太空头盔', ap: 60, cd: 10, effect: '腐化', quality: '紫' },
  { type: '头部', name: 'EnGrade', ap: 75, cd: 10, effect: '炽燃', quality: '金' },
  { type: '头部', name: '暗影面纱', ap: 80, cd: 15, dmgAmp: 0.12, effect: '光辉', quality: '金' },
  { type: '头部', name: '昆德拉', ap: 75, cd: 20, quality: '金' },
  { type: '头部', name: '龙首簪', ap: 55, cd: 15, penPct: 0.2, effect: '粉碎', quality: '金' },
  { type: '头部', name: '脸谱', ap: 90, cd: 20, pen: 10, effect: '减疗', quality: '红' },
  { type: '头部', name: '赛车头盔', ap: 80, cd: 10, effect: '光子发射器', quality: '金' },
  { type: '头部', name: '魔女帽', ap: 63, cd: 10, effect: '减疗', quality: '紫' },
  { type: '头部', name: '战队头盔', ap: 50, cd: 10, effect: '腐化', quality: '紫' },
  { type: '头部', name: '帝国战盔', ap: 78, quality: '紫' },
  { type: '头部', name: '帝国皇冠', ap: 63, cd: 15, quality: '紫' },
  { type: '手部', name: '翡翠石板', ap: 85, cd: 20, effect: '神速', quality: '金' },
  { type: '手部', name: '龙鳞', ap: 85, penPct: 0.15, quality: '金' },
  { type: '手部', name: '极光陀螺', ap: 82, effect: '魔力种子', quality: '金' },
  { type: '手部', name: '极光陀螺(满层)', ap: 102, cd: 20, effect: '魔力种子', quality: '金' },
  { type: '手部', name: '守护之眼', ap: 90, apPct: 0.15, uniqueApPct: true, quality: '金' },
  { type: '手部', name: '斯嘉蒂的手镯', ap: 82, cd: 10, effect: '寒波', quality: '金' },
  { type: '手部', name: '廷达罗斯君主', ap: 84, cd: 25, quality: '金' },
  { type: '手部', name: '鬼灵之爪', ap: 75, cd: 20, effect: '减疗', quality: '金' },
  { type: '手部', name: '芭蕉扇', ap: 82, cd: 10, effect: '诅咒', quality: '金' },
  { type: '手部', name: '荷鲁斯之眼', ap: 72, cd: 10, effect: '意念', quality: '金' },
  { type: '手部', name: '超星臂章', ap: 90, cd: 20, defense: 15, effect: '减疗', quality: '红' },
  { type: '手部', name: '死灵之书', ap: 100, penPct: 0.15, effect: '减疗', quality: '红' },
  { type: '手部', name: '巨人手套', ap: 62, cd: 10, effect: '减疗', quality: '紫' },
  { type: '手部', name: '德罗普尼尔', ap: 75, quality: '紫' },
  { type: '手部', name: '廷达罗斯手环', ap: 50, cd: 20, quality: '紫' },
  { type: '手部', name: '白羽扇', ap: 52, cd: 10, effect: '诅咒', quality: '紫' },
  { type: '手部', name: '邀明月', ap: 55, cd: 10, defense: 10, effect: '大师', quality: '金' },
  { type: '鞋子', name: '风火轮', ap: 25, cd: 5, quality: '紫' },
  { type: '鞋子', name: 'SCV', ap: 28, quality: '紫' },
  { type: '鞋子', name: '赤影', ap: 18, cd: 10, quality: '紫' },
  { type: '鞋子', name: '恨天高', ap: 60, apPct: 0.05, quality: '金' },
  { type: '鞋子', name: '万年冰鞋', ap: 33, cd: 15, quality: '金' },
  { type: '鞋子', name: '锋利长靴', ap: 42, cd: 10, quality: '金' },
  { type: '鞋子', name: '蔷薇轻履', ap: 50, cd: 10, effect: '觉醒,减疗', quality: '红' },
  { type: '鞋子', name: '精灵之靴', ap: 60, cd: 20, effect: '乘风,减疗', quality: '红' }
];

const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];
const DEFAULT_GEAR = {
  武器: '阿戈斯之眼',
  衣服: '私人订制',
  头部: '先知头巾',
  手部: '翡翠石板',
  鞋子: '精灵之靴'
};

const TARGETS = [
  { name: '自定义木桩', hp: 1000, defense: 140, defenseReduction: 0, reduction: 0 },
  { name: '6级全装T', hp: 2080, defense: 131, defenseReduction: 0, reduction: 0.16 },
  { name: '15级魔女帽T', hp: 3110, defense: 156, defenseReduction: 0, reduction: 0.16 },
  { name: '15级火衣头T', hp: 3160, defense: 166, defenseReduction: 0, reduction: 0.16 },
  { name: '20级全装T', hp: 4110, defense: 187, defenseReduction: 0, reduction: 0.16 },
  { name: '20级无惧感T', hp: 4110, defense: 212, defenseReduction: 0, reduction: 0.16 }
];

function getNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function pct(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function round(value, digits = 1) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function byName(name) {
  return EQUIPMENT.find((item) => item.name === name);
}

function calc({
  gear,
  mastery,
  talentAp,
  target,
  selfHp,
  damageBonus,
  skillReduction,
  r2Stacks,
  burstFollowUp,
  masterTriggered,
  ideaTriggered
}) {
  const selected = SLOTS.map((slot) => byName(gear[slot])).filter(Boolean);
  const equipAp = selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const cd = selected.reduce((sum, item) => sum + getNumber(item.cd), 0);
  const pen = selected.reduce((sum, item) => sum + getNumber(item.pen), 0);
  const penPct = selected.reduce((sum, item) => sum + getNumber(item.penPct), 0);
  const equipDefense = selected.reduce((sum, item) => sum + getNumber(item.defense), 0);
  const normalApPct = selected.reduce((sum, item) => sum + (item.uniqueApPct ? 0 : getNumber(item.apPct)), 0);
  const uniqueApPct = Math.max(0, ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => sum + getNumber(item.dmgAmp), 0);
  const masteryApPct = mastery * 0.041;
  const totalApPct = normalApPct + uniqueApPct + masteryApPct;
  const apRaw = (equipAp + talentAp) * (1 + totalApPct);
  const masterAp = masterTriggered ? mastery + 14 : 0;
  const ap = Math.floor(apRaw) + masterAp;
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - penPct) - pen;
  const defenseMod = 100 / (100 + finalDefense);
  const ideaDamageBonus = ideaTriggered ? 0.15 : 0;
  const totalDamageBonus = damageBonus + equipDamageBonus + ideaDamageBonus;
  const damageMod = 1 + totalDamageBonus - target.reduction - skillReduction;
  const finalMod = defenseMod * damageMod;
  const stackCount = Math.min(4, Math.max(0, r2Stacks));
  const skillBase = {
    q: 180 + ap * 0.65,
    q2: 50 + ap * 0.08,
    w: 160 + ap * 0.5 + target.hp * 0.1,
    e: 130 + ap * 0.4,
    e2: 160 + ap * 0.7,
    r: 80 + ap * 0.25,
    r2: 150 + ap * 0.25,
    r2Stacked: (150 + ap * 0.25) * (1 + stackCount * 0.2)
  };
  const skills = [
    { key: 'Q', title: 'Q 一段', base: skillBase.q, damage: skillBase.q * finalMod },
    { key: 'Q2', title: 'Q 二段/额外', base: skillBase.q2, damage: skillBase.q2 * finalMod },
    { key: 'W', title: 'W', base: skillBase.w, damage: skillBase.w * finalMod },
    { key: 'E', title: 'E 一段', base: skillBase.e, damage: skillBase.e * finalMod },
    { key: 'E2', title: 'E 二段', base: skillBase.e2, damage: skillBase.e2 * finalMod },
    { key: 'R', title: 'R 一段', base: skillBase.r, damage: skillBase.r * finalMod },
    { key: 'R2', title: 'R2', base: skillBase.r2, damage: skillBase.r2 * finalMod },
    { key: 'R2S', title: `R2 ${stackCount}层`, base: skillBase.r2Stacked, damage: skillBase.r2Stacked * finalMod }
  ];
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - selfHp) / selfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const corrosionTick = target.hp * (0.9 + 0.002 * ap) / 100;
  const scarBase = 10 + 20 + target.hp * 0.03;
  const tearBase = 50 + target.hp * 0.7 * 0.08;
  const effects = [
    { title: '诅咒(真伤)', value: curse, note: '4秒后触发' },
    { title: '腐化(技) 每跳', value: corrosionTick * finalMod, note: '共3跳' },
    { title: '腐化(技) 合计', value: corrosionTick * finalMod * 3, note: '3跳' },
    { title: '伤痕(技)', value: scarBase * finalMod, note: '10+20+目标血量*3%' },
    { title: '伤口撕裂', value: tearBase * finalMod, note: '以触发时70%血计算' }
  ];
  const ghostFire = 250 + ap * 0.2;
  const repelF = 5 * (10 + mastery) + target.hp * 0.006 + (burstFollowUp ? 3 * (10 + mastery) : 0);
  const yuminBase = {
    q: 110 + ap * 0.4,
    eq: 130 + ap * 0.4,
    w: 200 + ap * 0.7,
    ew: 240 + ap * 0.75,
    e: 200 + ap * 0.5,
    r1: 150 + ap * 0.45,
    r2: 300 + ap * 0.7,
    r2Hp: 300 + ap * 0.7 + target.hp * 0.1
  };
  const yuminSkills = [
    { key: 'YQ', title: 'Q 每跳', base: yuminBase.q, damage: yuminBase.q * finalMod },
    { key: 'YEQ', title: 'EQ 每跳', base: yuminBase.eq, damage: yuminBase.eq * finalMod },
    { key: 'YW', title: 'W', base: yuminBase.w, damage: yuminBase.w * finalMod },
    { key: 'YEW', title: 'EW', base: yuminBase.ew, damage: yuminBase.ew * finalMod },
    { key: 'YE', title: 'E', base: yuminBase.e, damage: yuminBase.e * finalMod },
    { key: 'YR1', title: 'R 一段', base: yuminBase.r1, damage: yuminBase.r1 * finalMod },
    { key: 'YR2', title: 'R 二段', base: yuminBase.r2, damage: yuminBase.r2 * finalMod },
    { key: 'YR2HP', title: 'R 二段 + 10%目标血', base: yuminBase.r2Hp, damage: yuminBase.r2Hp * finalMod }
  ];
  const yuminQ3 = yuminBase.q * finalMod * 3;
  const yuminEq4 = yuminBase.eq * finalMod * 4;
  const yuminEqqw = yuminQ3 + yuminEq4 + yuminBase.e * finalMod + yuminBase.w * finalMod;
  const yuminCombos = [
    { title: 'Q 三跳全中', value: yuminQ3, note: '工作簿 Q*3' },
    { title: 'EQ 四跳全中', value: yuminEq4, note: '工作簿 EQ*4' },
    { title: 'EQQW 全中', value: yuminEqqw, note: 'Q3 + EQ4 + E + W' },
    { title: 'EQQW + 装备 DOT', value: yuminEqqw + ghostFire + corrosionTick * finalMod * 3, note: '鬼火 + 腐化3跳' }
  ];

  return {
    selected,
    equipAp,
    talentAp,
    cd,
    pen,
    penPct,
    equipDefense,
    normalApPct,
    uniqueApPct,
    masteryApPct,
    totalApPct,
    masterAp,
    ap,
    apRaw,
    finalDefense,
    defenseMod,
    equipDamageBonus,
    ideaDamageBonus,
    totalDamageBonus,
    damageMod,
    finalMod,
    hpDiffRatio,
    burstBonus,
    skills,
    effects,
    effectSubtotal: curse + corrosionTick * finalMod * 3 + scarBase * finalMod + tearBase * finalMod,
    ghostFire,
    repelF,
    yuminSkills,
    yuminCombos
  };
}

function Field({ label, value, onChange, suffix, min, max, step = 1 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="fieldInput">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(getNumber(event.target.value))}
        />
        {suffix ? <b>{suffix}</b> : null}
      </div>
    </label>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export default function App() {
  const [gear, setGear] = useState(DEFAULT_GEAR);
  const [mastery, setMastery] = useState(20);
  const [talentAp, setTalentAp] = useState(52);
  const [targetIndex, setTargetIndex] = useState(0);
  const [target, setTarget] = useState(TARGETS[0]);
  const [selfHp, setSelfHp] = useState(2514);
  const [damageBonus, setDamageBonus] = useState(0);
  const [skillReduction, setSkillReduction] = useState(0);
  const [r2Stacks, setR2Stacks] = useState(1);
  const [burstFollowUp, setBurstFollowUp] = useState(true);
  const [masterTriggered, setMasterTriggered] = useState(false);
  const [ideaTriggered, setIdeaTriggered] = useState(false);
  const result = useMemo(
    () => calc({
      gear,
      mastery,
      talentAp,
      target,
      selfHp,
      damageBonus,
      skillReduction,
      r2Stacks,
      burstFollowUp,
      masterTriggered,
      ideaTriggered
    }),
    [gear, mastery, talentAp, target, selfHp, damageBonus, skillReduction, r2Stacks, burstFollowUp, masterTriggered, ideaTriggered]
  );

  function updateGear(slot, name) {
    setGear((current) => ({ ...current, [slot]: name }));
  }

  function pickTarget(index) {
    const next = TARGETS[index];
    setTargetIndex(index);
    setTarget(next);
  }

  function updateTarget(key, value) {
    setTargetIndex(0);
    setTarget((current) => ({ ...current, name: '自定义目标', [key]: value }));
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Excel 改版复刻</p>
          <h1>ER 伤害计算器</h1>
          <p className="intro">选择装备、填写目标数据，即时计算法强、防御修正、修女技能和特效伤害，并同步查看俞岷 5 级技能连段。公式来自工作簿，所有最终伤害默认展示向下取整结果。</p>
        </div>
        <div className="heroPanel">
          <span>最终法强</span>
          <strong>{result.ap}</strong>
          <small>装备 {result.equipAp} + 天赋 {talentAp}，法强加成 {pct(result.totalApPct)}{result.masterAp ? `，大师 +${result.masterAp}` : ''}</small>
        </div>
      </section>

      <section className="grid twoColumns">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Build</p>
              <h2>装备选择</h2>
            </div>
            <span className="pill">CD {result.cd}</span>
          </div>
          <div className="gearGrid">
            {SLOTS.map((slot) => (
              <label className="selectBlock" key={slot}>
                <span>{slot}</span>
                <select value={gear[slot]} onChange={(event) => updateGear(slot, event.target.value)}>
                  {EQUIPMENT.filter((item) => item.type === slot).map((item) => (
                    <option value={item.name} key={item.name}>{`${item.quality || '-'} ${item.name}`}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="chips">
            {result.selected.map((item) => (
              <span className={`chip ${item.quality === '红' ? 'red' : item.quality === '金' ? 'gold' : 'purple'}`} key={item.name}>
                {item.name}{item.effect ? ` / ${item.effect}` : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Target</p>
              <h2>目标与增减伤</h2>
            </div>
            <span className="pill">修正 {round(result.finalMod, 3)}</span>
          </div>
          <label className="selectBlock full">
            <span>预设目标</span>
            <select value={targetIndex} onChange={(event) => pickTarget(Number(event.target.value))}>
              {TARGETS.map((item, index) => <option value={index} key={item.name}>{item.name}</option>)}
            </select>
          </label>
          <div className="formGrid">
            <Field label="目标血量" value={target.hp} onChange={(value) => updateTarget('hp', value)} />
            <Field label="目标防御" value={target.defense} onChange={(value) => updateTarget('defense', value)} />
            <Field label="目标防御降低" value={target.defenseReduction} onChange={(value) => updateTarget('defenseReduction', value)} suffix="小数" step={0.01} />
            <Field label="目标减伤" value={target.reduction} onChange={(value) => updateTarget('reduction', value)} suffix="小数" step={0.01} />
            <Field label="自身血量" value={selfHp} onChange={setSelfHp} />
            <Field label="手动技伤加成" value={damageBonus} onChange={setDamageBonus} suffix="小数" step={0.01} />
            <Field label="技能减免" value={skillReduction} onChange={setSkillReduction} suffix="小数" step={0.01} />
          </div>
        </div>
      </section>

      <section className="stats">
        <StatCard label="最终防御" value={round(result.finalDefense, 1)} hint={`防御修正 ${pct(result.defenseMod)}`} />
        <StatCard label="防穿" value={`${result.pen} / ${pct(result.penPct)}`} hint="数值 / 百分比" />
        <StatCard label="技伤加成" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 开关 ${pct(result.ideaDamageBonus)}`} />
        <StatCard label="增减伤合算" value={pct(result.damageMod - 1)} hint={`最终倍率 ${round(result.damageMod, 3)}`} />
        <StatCard label="血量差比" value={pct(result.hpDiffRatio)} hint={`爆发力追伤 ${pct(result.burstBonus)}`} />
      </section>

      <section className="grid twoColumns">
        <div className="panel damagePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Skills</p>
              <h2>技能伤害</h2>
            </div>
            <Field label="R2层数" value={r2Stacks} onChange={setR2Stacks} min={0} max={4} />
          </div>
          <div className="damageList">
            {result.skills.map((skill) => (
              <div className="damageRow" key={skill.key}>
                <div>
                  <strong>{skill.title}</strong>
                  <span>基础 {round(skill.base, 1)}</span>
                </div>
                <b>{Math.floor(skill.damage)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel damagePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Effects</p>
              <h2>特效与附加</h2>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={burstFollowUp} onChange={(event) => setBurstFollowUp(event.target.checked)} />
              <span>斥力弹额外3段</span>
            </label>
          </div>
          <div className="damageList">
            {result.effects.map((effect) => (
              <div className="damageRow" key={effect.title}>
                <div>
                  <strong>{effect.title}</strong>
                  <span>{effect.note}</span>
                </div>
                <b>{Math.floor(effect.value)}</b>
              </div>
            ))}
            <div className="damageRow highlight">
              <div>
                <strong>特效小计</strong>
                <span>诅咒+腐化3跳+伤痕+撕裂</span>
              </div>
              <b>{Math.floor(result.effectSubtotal)}</b>
            </div>
            <div className="damageRow">
              <div>
                <strong>鬼火(真伤)</strong>
                <span>250 + 法强 * 20%</span>
              </div>
              <b>{Math.floor(result.ghostFire)}</b>
            </div>
            <div className="damageRow">
              <div>
                <strong>斥力弹F</strong>
                <span>5段 + 可选额外3段</span>
              </div>
              <b>{Math.floor(result.repelF)}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="panel formulaPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Yumin</p>
            <h2>俞岷 5级技能与连段</h2>
          </div>
          <span className="pill">共用修正 {round(result.finalMod, 3)}</span>
        </div>
        <div className="grid twoColumns">
          <div className="damageList">
            {result.yuminSkills.map((skill) => (
              <div className="damageRow" key={skill.key}>
                <div>
                  <strong>{skill.title}</strong>
                  <span>基础 {round(skill.base, 1)}</span>
                </div>
                <b>{Math.floor(skill.damage)}</b>
              </div>
            ))}
          </div>
          <div className="damageList">
            {result.yuminCombos.map((combo) => (
              <div className={`damageRow ${combo.title === 'EQQW 全中' ? 'highlight' : ''}`} key={combo.title}>
                <div>
                  <strong>{combo.title}</strong>
                  <span>{combo.note}</span>
                </div>
                <b>{Math.floor(combo.value)}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel formulaPanel">
        <div>
          <p className="eyebrow">Formula</p>
          <h2>计算过程</h2>
        </div>
        <div className="formulaGrid">
          <StatCard label="装备法强" value={result.equipAp} hint="5件装备求和" />
          <StatCard label="天赋法强" value={talentAp} hint="可手动调整" />
          <StatCard label="熟练度法强%" value={pct(result.masteryApPct)} hint="修女按每级4.1%" />
          <StatCard label="独有法强%" value={pct(result.uniqueApPct)} hint="重复独有取最高" />
        </div>
        <div className="formGrid compact">
          <Field label="熟练度等级" value={mastery} onChange={setMastery} min={1} max={20} />
          <Field label="天赋法强" value={talentAp} onChange={setTalentAp} />
        </div>
        <div className="toggles">
          <label className="toggle">
            <input type="checkbox" checked={masterTriggered} onChange={(event) => setMasterTriggered(event.target.checked)} />
            <span>大师触发，法强 + 熟练度 + 14</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={ideaTriggered} onChange={(event) => setIdeaTriggered(event.target.checked)} />
            <span>意念触发，技伤 +15%</span>
          </label>
        </div>
        <p className="note">最终伤害 = 技能基础值 * 100 / (100 + 目标防御 * (1 - 防御降低) * (1 - 防穿%) - 防穿数值) * (1 + 技伤加成 - 目标减伤 - 技能减免)。</p>
      </section>
    </main>
  );
}
