import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DAK_ITEM_SKILL_ICONS from '../data/dakItemSkillIcons.json';
import { getNumber, pct, round } from '../lib/formula.js';

const LOCAL_EQUIP_ICONS = import.meta.glob('../../assets/game-icons/equipment/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url'
});

// 建立 code -> 本地打包图标 URL 映射（零运行时开销）
const LOCAL_ICON_BY_CODE = (() => {
  const map = new Map();
  for (const [filePath, url] of Object.entries(LOCAL_EQUIP_ICONS)) {
    const match = filePath.match(/equipment-(\d+)-/);
    if (match) map.set(match[1], url);
  }
  return map;
})();

// 建立 DAK 图标与词条兜底索引（兼顾无本地 PNG 的 S13 新增装备）
const { DAK_BY_CODE, DAK_BY_NAME } = (() => {
  const byCode = new Map();
  const byName = new Map();
  for (const entry of DAK_ITEM_SKILL_ICONS.equipment || []) {
    const idStr = String(entry.id || '');
    if (idStr) byCode.set(idStr, entry);
    if (entry.name && !byName.has(entry.name)) byName.set(entry.name, entry);
  }
  return { DAK_BY_CODE: byCode, DAK_BY_NAME: byName };
})();

// 永恒轮回常用中韩简称/黑话搜索别名映射
const ITEM_SEARCH_ALIASES = {
  '私人订制': 'kt couturier 쿠튀 高定 定制',
  '私人定制': 'kt couturier 쿠튀 高定 定制',
  '幽灵面具': 'peso persona 페소 假面 面具',
  '双重假面': 'peso 페소 假面',
  '神职法衣': 'eta 에타 圣法衣 法衣 祭司袍',
  '龙鳞': 'yb 용비 ll 龙鳞护腕',
  '昆德拉': 'kdl kundala 쿤달라',
  '血色斗篷': '핏망 红斗篷 腐化斗篷',
  '斯嘉蒂的手镯': 'skd skadi 스카디 冰手镯',
  '荷鲁斯之眼': 'horus 호루스 荷鲁斯',
  '廷达罗斯君主': 'tindalos 틴달 大廷达 君主手',
  '廷达罗斯手环': 'tindalos 틴달 小廷达',
  '阿戈斯之眼': 'argos 아르고스 眼睛刺剑',
  '倒吊人': 'hanged 매달린 蝴蝶圣器',
  '战术重甲': '택아 重甲',
  '蔷薇轻履': '미부 红鞋 粉鞋',
  '精灵之靴': '미부 秘银靴 红鞋',
  '恨天高': '킬힐 高跟鞋',
  '翡翠石板': '石板 超负荷',
  '鬼灵之爪': '鬼爪 斩削',
  '超星臂章': '臂章 斩削',
  '异端审判官': '审判官 裂痕衣',
  '越王勾践剑': '勾践 越王剑'
};

const SLOT_GLYPHS = {
  '武器': '⚔',
  '衣服': '🛡',
  '头部': '👑',
  '手部': '🧤',
  '鞋子': '👢'
};

const QUALITY_TIER_KEY = {
  '神话': 'mythic', '红': 'mythic',
  '传说': 'legend', '金': 'legend',
  '英雄': 'epic', '紫': 'epic',
  '稀有': 'rare', '蓝': 'rare',
  '高级': 'uncommon', '绿': 'uncommon',
  '普通': 'common', '白': 'common'
};

const QUALITY_SHORT_LABELS = {
  mythic: '超凡',
  legend: '传说',
  epic: '英雄',
  rare: '稀有',
  uncommon: '高级',
  common: '普通'
};

const STAT_FILTERS = [
  { key: 'ap', label: '法强/技增', test: (s, it) => Boolean(s.skillAmp || s.skillAmpByLevel || s.skillAmpRatio || s.uniqueSkillAmpRatio || s.adaptiveForce || s.adaptiveForceByLevel || it.ap) },
  { key: 'atk', label: '攻击力', test: (s, it) => Boolean(s.attackPower || s.attackPowerByLv || s.adaptiveForce || s.adaptiveForceByLevel || it.attackPower) },
  { key: 'cd', label: '冷却CD', test: (s, it) => Boolean(s.cooldownReduction || s.cooldownLimit || s.uniqueCooldownLimit || it.cd) },
  { key: 'pen', label: '防穿', test: (s, it) => Boolean(s.penetrationDefense || s.penetrationDefenseRatio || s.uniquePenetrationDefense || s.uniquePenetrationDefenseRatio || it.pen || it.penPct) },
  { key: 'as', label: '攻速', test: (s) => Boolean(s.attackSpeedRatio || s.attackSpeedRatioByLv) },
  { key: 'crit', label: '暴击', test: (s) => Boolean(s.criticalStrikeChance || s.criticalStrikeDamage) },
  { key: 'ba', label: '普攻增幅', test: (s) => Boolean(s.increaseBasicAttackDamageRatio || s.increaseBasicAttackDamageRatioByLv || s.increaseBasicAttackDamage || s.increaseBasicAttackDamageByLv) },
  { key: 'tank', label: '体力/防御', test: (s, it) => Boolean(s.maxHp || s.maxHpByLv || s.defense || s.defenseByLv || it.maxHp || it.defense) },
  { key: 'antiheal', label: '减疗', test: (_, __, effs) => effs.some((e) => e.includes('减少治疗') || e.includes('伤痕') || e.includes('减疗')) },
  { key: 'effect', label: '独有特效', test: (_, __, effs) => effs.length > 0 }
];

export function resolveEquipmentIconUrl(item) {
  if (!item) return '';
  const codeStr = item.code ? String(item.code) : '';
  if (codeStr && LOCAL_ICON_BY_CODE.has(codeStr)) {
    return LOCAL_ICON_BY_CODE.get(codeStr);
  }
  const dakMeta = (codeStr && DAK_BY_CODE.get(codeStr)) || DAK_BY_NAME.get(item.name);
  if (dakMeta) {
    const dakId = String(dakMeta.id || '');
    if (dakId && LOCAL_ICON_BY_CODE.has(dakId)) return LOCAL_ICON_BY_CODE.get(dakId);
    if (dakMeta.imageUrl) {
      return dakMeta.imageUrl.startsWith('//') ? `https:${dakMeta.imageUrl}` : dakMeta.imageUrl;
    }
  }
  return '';
}

function summarizeItemStats(item, mastery = 20) {
  if (!item) return [];
  const s = item.stats || {};
  const lv = Math.max(1, getNumber(mastery) || 20);
  const parts = [];

  const apFlat = getNumber(s.skillAmp) || getNumber(item.ap);
  const apLv = getNumber(s.skillAmpByLevel);
  if (apFlat || apLv) {
    parts.push(`技增 ${round(apFlat + apLv * lv, 0)}${apLv ? `(${apLv}/级)` : ''}`);
  }
  const adapt = getNumber(s.adaptiveForce) + getNumber(s.adaptiveForceByLevel) * lv;
  if (adapt) parts.push(`适性 ${round(adapt, 0)}`);

  const atkFlat = getNumber(s.attackPower) || getNumber(item.attackPower);
  const atkLv = getNumber(s.attackPowerByLv);
  if (atkFlat || atkLv) {
    parts.push(`攻击 ${round(atkFlat + atkLv * lv, 0)}${atkLv ? `(${atkLv}/级)` : ''}`);
  }

  const apRatio = Math.max(getNumber(s.uniqueSkillAmpRatio), getNumber(s.skillAmpRatio), getNumber(item.apPct));
  if (apRatio) parts.push(`法强+${pct(apRatio)}`);

  const cd = getNumber(s.cooldownReduction) || getNumber(item.cd);
  if (cd) parts.push(`CD ${cd}`);

  const penPct = getNumber(s.penetrationDefenseRatio) + getNumber(s.uniquePenetrationDefenseRatio) || getNumber(item.penPct);
  const penFlat = getNumber(s.penetrationDefense) + getNumber(s.uniquePenetrationDefense) || getNumber(item.pen);
  if (penPct) parts.push(`穿甲 ${pct(penPct)}`);
  if (penFlat) parts.push(`穿甲 +${penFlat}`);

  const as = getNumber(s.attackSpeedRatio) + getNumber(s.attackSpeedRatioByLv) * lv;
  if (as) parts.push(`攻速 ${pct(as)}`);

  const crit = getNumber(s.criticalStrikeChance);
  if (crit) parts.push(`暴击 ${pct(crit)}`);
  const critDmg = getNumber(s.criticalStrikeDamage);
  if (critDmg) parts.push(`暴伤 ${pct(critDmg)}`);

  const baRatio = getNumber(s.increaseBasicAttackDamageRatio) + getNumber(s.increaseBasicAttackDamageRatioByLv) * lv;
  if (baRatio) parts.push(`普增 ${pct(baRatio)}`);

  const def = (getNumber(s.defense) || getNumber(item.defense)) + getNumber(s.defenseByLv) * lv;
  if (def) parts.push(`防御 ${round(def, 0)}`);

  const hp = (getNumber(s.maxHp) || getNumber(item.maxHp)) + getNumber(s.maxHpByLv) * lv;
  if (hp) parts.push(`体力 ${round(hp, 0)}`);

  return parts;
}

export function EquipmentSlotIcon({ item, slot, size = 44 }) {
  const url = resolveEquipmentIconUrl(item);
  const [failedUrl, setFailedUrl] = useState('');
  const tier = QUALITY_TIER_KEY[item?.quality] || 'common';
  const showImg = Boolean(url && failedUrl !== url);

  return (
    <span
      className={`vgEquipIconBox tier-${item ? tier : 'empty'}`}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          key={url}
          src={url}
          alt={item?.name || slot}
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span className="vgEquipFallbackGlyph" aria-hidden="true">
          {item ? item.name.slice(0, 1) : (SLOT_GLYPHS[slot] || '空')}
        </span>
      )}
    </span>
  );
}

export default function VisualGearBar({
  slots,
  gear,
  equipment,
  choicesBySlot,
  mastery = 20,
  uiTheme = 'night',
  compact = false,
  weaponTypeFilter = '全部类型',
  heroWeaponOptions = [],
  onChangeWeaponType,
  showLowerTierEquipment = false,
  onToggleLowerTier,
  onSelectGear,
  uniqueEffectsForItem,
  qualityColor,
  PortalHovercard,
  renderHoverContent
}) {
  const [openSlot, setOpenSlot] = useState(null);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statFilter, setStatFilter] = useState('');
  const [chainMode, setChainMode] = useState(false);
  const searchInputRef = useRef(null);

  const findItem = (name) => (name ? equipment.find((x) => x.name === name) : null);

  useEffect(() => {
    if (!openSlot) return undefined;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 30);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenSlot(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openSlot]);

  const activeChoices = useMemo(() => {
    if (!openSlot) return [];
    const list = choicesBySlot[openSlot] || [];
    const q = query.trim().toLowerCase();
    const activeStatRule = STAT_FILTERS.find((f) => f.key === statFilter);

    return list.filter((item) => {
      const tier = QUALITY_TIER_KEY[item.quality] || 'common';
      if (tierFilter !== 'all' && tier !== tierFilter) return false;

      const effs = uniqueEffectsForItem ? uniqueEffectsForItem(item) : [];
      if (activeStatRule && !activeStatRule.test(item.stats || {}, item, effs)) {
        return false;
      }

      if (!q) return true;
      const statsSummary = summarizeItemStats(item, mastery).join(' ').toLowerCase();
      const alias = ITEM_SEARCH_ALIASES[item.name] || '';
      const haystack = [
        item.name,
        item.weaponType,
        effs.join(' '),
        statsSummary,
        alias
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [openSlot, choicesBySlot, query, tierFilter, statFilter, mastery, uniqueEffectsForItem]);

  function handlePickItem(itemName) {
    if (!openSlot) return;
    onSelectGear(openSlot, itemName);
    if (chainMode) {
      const idx = slots.indexOf(openSlot);
      if (idx >= 0 && idx < slots.length - 1) {
        setOpenSlot(slots[idx + 1]);
        setQuery('');
        return;
      }
    }
    setOpenSlot(null);
  }

  function openModalForSlot(slot) {
    setOpenSlot(slot);
    setQuery('');
  }

  return (
    <>
      <div className={`vgSlotStrip ${compact ? 'isCompact' : ''}`.trim()}>
        {slots.map((slot) => {
          const item = findItem(gear[slot]);
          const effects = item && uniqueEffectsForItem ? uniqueEffectsForItem(item) : [];
          const statsText = item ? summarizeItemStats(item, mastery).slice(0, compact ? 2 : 3).join(' · ') : '';
          const color = item && qualityColor ? qualityColor(item.quality, uiTheme) : undefined;

          const cardInner = (
            <div
              role="button"
              tabIndex={0}
              className={`vgSlotCard ${item ? 'filled' : 'empty'} ${openSlot === slot ? 'active' : ''}`.trim()}
              onClick={() => openModalForSlot(slot)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openModalForSlot(slot);
                }
              }}
            >
              <EquipmentSlotIcon item={item} slot={slot} size={compact ? 36 : 44} />
              <div className="vgSlotMeta">
                <div className="vgSlotTopRow">
                  <span className="vgSlotTag">{slot}</span>
                  {item ? (
                    <button
                      type="button"
                      className="vgSlotClearBtn"
                      title={`卸下${slot}（设为空栏）`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGear(slot, '');
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <strong className="vgSlotItemName" style={color ? { color } : undefined}>
                  {item ? item.name : '（空）点击选装'}
                </strong>
                {!compact ? (
                  <small className="vgSlotSubText">
                    {item
                      ? ([statsText, effects[0] ? `[${effects[0]}]` : ''].filter(Boolean).join(' ') || item.quality || '已穿戴')
                      : '未穿戴装备'}
                  </small>
                ) : null}
              </div>
            </div>
          );

          if (item && PortalHovercard && renderHoverContent) {
            return (
              <PortalHovercard
                key={slot}
                className="vgSlotHoverWrap"
                content={renderHoverContent(item)}
              >
                {cardInner}
              </PortalHovercard>
            );
          }
          return <div className="vgSlotHoverWrap" key={slot}>{cardInner}</div>;
        })}
      </div>

      {openSlot ? createPortal(
        <div className="vgModalBackdrop" role="presentation" onMouseDown={() => setOpenSlot(null)}>
          <section
            className="vgModalDialog"
            role="dialog"
            aria-modal="true"
            aria-label={`选择${openSlot}装备`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* 顶部 5 部位无缝切换栏 */}
            <div className="vgModalHeader">
              <div className="vgModalSlotTabs">
                {slots.map((slot) => {
                  const eqItem = findItem(gear[slot]);
                  return (
                    <button
                      type="button"
                      key={slot}
                      className={`vgModalSlotTab ${openSlot === slot ? 'active' : ''}`}
                      onClick={() => { setOpenSlot(slot); setQuery(''); }}
                    >
                      <EquipmentSlotIcon item={eqItem} slot={slot} size={26} />
                      <div className="vgModalSlotTabText">
                        <span>{slot}</span>
                        <small>{eqItem ? eqItem.name : '（空）'}</small>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="vgModalHeaderActions">
                <label className="vgChainToggle" title="开启后选完一件装备会自动跳到下一个部位，5次点击配完满装">
                  <input
                    type="checkbox"
                    checked={chainMode}
                    onChange={(e) => setChainMode(e.target.checked)}
                  />
                  <span>连配模式</span>
                </label>
                <button type="button" className="quietButton vgCloseBtn" onClick={() => setOpenSlot(null)}>
                  关闭 Esc
                </button>
              </div>
            </div>

            {/* 搜索框 + 武器类型快切 + 品级与属性胶囊 */}
            <div className="vgFilterSection">
              <div className="vgSearchRow">
                <input
                  ref={searchInputRef}
                  type="search"
                  className="vgSearchInput"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`搜索${openSlot}名称、特效（如 超负荷 / 斩削 / 刺伤）或简称（kt / kdl / 假面）...`}
                />
                <button
                  type="button"
                  className="quietButton"
                  onClick={() => handlePickItem('')}
                  title="将该部位设为空栏（不穿）"
                >
                  设为（空）
                </button>
                {onToggleLowerTier ? (
                  <label className="vgChainToggle">
                    <input
                      type="checkbox"
                      checked={showLowerTierEquipment}
                      onChange={(e) => onToggleLowerTier(e.target.checked)}
                    />
                    <span>含紫装以下</span>
                  </label>
                ) : null}
              </div>

              {openSlot === '武器' && heroWeaponOptions.length > 1 && onChangeWeaponType ? (
                <div className="vgChipRow">
                  <span className="vgChipLabel">武器类型:</span>
                  {heroWeaponOptions.map((wt) => (
                    <button
                      type="button"
                      key={wt}
                      className={`vgFilterPill ${weaponTypeFilter === wt ? 'active' : ''}`}
                      onClick={() => onChangeWeaponType(wt)}
                    >
                      {wt === '全部类型' ? '全部可用武器' : wt.split('/')[0].trim()}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="vgChipRow">
                <span className="vgChipLabel">品级:</span>
                {[
                  { key: 'all', label: '全部品级' },
                  { key: 'mythic', label: '超凡 (红)' },
                  { key: 'legend', label: '传说 (金)' },
                  { key: 'epic', label: '英雄 (紫)' },
                  ...(showLowerTierEquipment ? [{ key: 'rare', label: '稀有 (蓝)' }] : [])
                ].map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    className={`vgFilterPill tierPill-${t.key} ${tierFilter === t.key ? 'active' : ''}`.trim()}
                    onClick={() => setTierFilter(tierFilter === t.key ? 'all' : t.key)}
                  >
                    {t.label}
                  </button>
                ))}

                <span className="vgChipDivider" />
                <span className="vgChipLabel">词条快筛:</span>
                {STAT_FILTERS.map((sf) => (
                  <button
                    type="button"
                    key={sf.key}
                    className={`vgFilterPill ${statFilter === sf.key ? 'active' : ''}`}
                    onClick={() => setStatFilter(statFilter === sf.key ? '' : sf.key)}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 装备图标网格列表 */}
            <div className="vgItemGrid">
              {activeChoices.length ? activeChoices.map((item) => {
                const isSelected = gear[openSlot] === item.name;
                const tier = QUALITY_TIER_KEY[item.quality] || 'common';
                const color = qualityColor ? qualityColor(item.quality, uiTheme) : undefined;
                const statsArr = summarizeItemStats(item, mastery);
                const effs = uniqueEffectsForItem ? uniqueEffectsForItem(item) : [];

                return (
                  <button
                    type="button"
                    key={`${item.type}-${item.code || item.name}`}
                    className={`vgItemOptionCard tier-${tier} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handlePickItem(item.name)}
                  >
                    <EquipmentSlotIcon item={item} slot={openSlot} size={46} />
                    <div className="vgItemCardBody">
                      <div className="vgItemTitleLine">
                        <strong style={color ? { color } : undefined}>{item.name}</strong>
                        <span className={`vgRarityTag tier-${tier}`}>{QUALITY_SHORT_LABELS[tier] || item.quality}</span>
                      </div>
                      <div className="vgItemStatsLine">
                        {statsArr.length ? statsArr.join(' · ') : '基础装备'}
                      </div>
                      {effs.length ? (
                        <div className="vgItemEffectsLine">
                          {effs.map((ef) => <span className="vgEffectBadge" key={ef}>{ef}</span>)}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              }) : (
                <div className="vgEmptyState">
                  没有找到符合当前筛选条件的{openSlot}，可尝试清空搜索词或词条快筛。
                </div>
              )}
            </div>

            <div className="vgModalFooter">
              <span>共 {activeChoices.length} 件可选{openSlot}（属性已按当前熟练度 Lv.{mastery} 折算成长值）</span>
              {(tierFilter !== 'all' || statFilter || query) ? (
                <button
                  type="button"
                  className="quietButton"
                  onClick={() => { setQuery(''); setTierFilter('all'); setStatFilter(''); }}
                >
                  重置全部筛选
                </button>
              ) : null}
            </div>
          </section>
        </div>,
        document.body
      ) : null}
    </>
  );
}
