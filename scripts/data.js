import { MODULE_ID, FLAG_SCOPE, FLAGS, ARMOR_FOCUS_NAMES } from "./constants.js";

const getPropertySafe = (object, path) => foundry?.utils?.getProperty ? foundry.utils.getProperty(object, path) : path.split(".").reduce((o, k) => o?.[k], object);
const duplicateSafe = (object) => foundry?.utils?.deepClone ? foundry.utils.deepClone(object) : JSON.parse(JSON.stringify(object ?? {}));

export function localize(key, data = {}) {
  return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

export function debug(...args) {
  if (game.settings?.get(MODULE_ID, "debug")) console.log(`${MODULE_ID} |`, ...args);
}

export function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

export function canControlActor(actor, action = "adjust") {
  if (!actor) return false;
  if (game.user.isGM) return true;
  const hasOwnership = actor.isOwner || actor.testUserPermission?.(game.user, "OWNER");
  if (!hasOwnership) return false;
  if (action === "refill") return game.settings.get(MODULE_ID, "playerRefill");
  return game.settings.get(MODULE_ID, "playerAdjust");
}

export function getSoakData(actor) {
  const data = duplicateSafe(actor?.flags?.[FLAG_SCOPE] ?? {});
  return {
    current: clampNumber(data.current ?? 0),
    max: clampNumber(data.max ?? 0),
    armorSoak: clampNumber(data.armorSoak ?? 0),
    naturalSoak: clampNumber(data.naturalSoak ?? 0),
    armorMultiplier: clampNumber(data.armorMultiplier ?? 0),
    armorAc: clampNumber(data.armorAc ?? 0),
    naturalArmor: clampNumber(data.naturalArmor ?? 0),
    hitDice: clampNumber(data.hitDice ?? 0),
    enabled: data.enabled !== false,
    autoRefill: data.autoRefill !== false,
    lastCalculated: data.lastCalculated ?? null,
    lastRefillKey: data.lastRefillKey ?? null
  };
}

export async function setSoakFlagData(actor, data) {
  if (!actor) return null;
  const merged = foundry.utils.mergeObject(getSoakData(actor), data, { inplace: false });
  merged.current = clampNumber(merged.current, 0, game.settings.get(MODULE_ID, "allowOverflow") ? Number.MAX_SAFE_INTEGER : merged.max);
  merged.max = clampNumber(merged.max);
  merged.armorSoak = clampNumber(merged.armorSoak);
  merged.naturalSoak = clampNumber(merged.naturalSoak);
  merged.armorMultiplier = clampNumber(merged.armorMultiplier);
  merged.armorAc = clampNumber(merged.armorAc);
  merged.naturalArmor = clampNumber(merged.naturalArmor);
  merged.hitDice = clampNumber(merged.hitDice);
  await actor.setFlag(FLAG_SCOPE, FLAGS.CURRENT, merged.current);
  await actor.setFlag(FLAG_SCOPE, FLAGS.MAX, merged.max);
  await actor.setFlag(FLAG_SCOPE, FLAGS.ARMOR_SOAK, merged.armorSoak);
  await actor.setFlag(FLAG_SCOPE, FLAGS.NATURAL_SOAK, merged.naturalSoak);
  await actor.setFlag(FLAG_SCOPE, FLAGS.ARMOR_MULTIPLIER, merged.armorMultiplier);
  await actor.setFlag(FLAG_SCOPE, FLAGS.ARMOR_AC, merged.armorAc);
  await actor.setFlag(FLAG_SCOPE, FLAGS.NATURAL_ARMOR, merged.naturalArmor);
  await actor.setFlag(FLAG_SCOPE, FLAGS.HIT_DICE, merged.hitDice);
  await actor.setFlag(FLAG_SCOPE, FLAGS.ENABLED, merged.enabled);
  await actor.setFlag(FLAG_SCOPE, FLAGS.AUTO_REFILL, merged.autoRefill);
  await actor.setFlag(FLAG_SCOPE, FLAGS.LAST_CALCULATED, merged.lastCalculated);
  await actor.setFlag(FLAG_SCOPE, FLAGS.LAST_REFILL_KEY, merged.lastRefillKey);
  return merged;
}

export function getHitDice(actor) {
  const candidates = [
    "system.attributes.hd.total",
    "system.attributes.hd",
    "system.details.level.value",
    "system.details.cr.total",
    "system.details.cr.base",
    "system.details.cr"
  ];
  for (const path of candidates) {
    const value = getPropertySafe(actor, path);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  }
  const classItems = actor.items?.filter?.(i => i.type === "class") ?? [];
  const classTotal = classItems.reduce((total, item) => total + clampNumber(getPropertySafe(item, "system.level") ?? getPropertySafe(item, "system.levels") ?? 0), 0);
  return Math.max(1, classTotal || 1);
}

export function getNaturalArmor(actor) {
  const candidates = [
    "system.attributes.ac.natural.total",
    "system.attributes.ac.natural",
    "system.attributes.ac.normal.natural",
    "system.attributes.ac.bonus.natural",
    "system.attributes.naturalAC"
  ];
  for (const path of candidates) {
    const value = getPropertySafe(actor, path);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  }
  return 0;
}

function itemIsEquipped(item) {
  return Boolean(getPropertySafe(item, "system.equipped") ?? getPropertySafe(item, "system.carried") ?? false);
}

function itemIsArmor(item) {
  if (!item || item.type !== "equipment") return false;
  const subtype = String(getPropertySafe(item, "system.subType") ?? getPropertySafe(item, "system.subtype") ?? getPropertySafe(item, "system.equipmentType") ?? "").toLowerCase();
  const armorType = String(getPropertySafe(item, "system.armor.type") ?? getPropertySafe(item, "system.armorType") ?? "").toLowerCase();
  const slot = String(getPropertySafe(item, "system.slot") ?? "").toLowerCase();
  const name = String(item.name ?? "").toLowerCase();
  const isShield = subtype.includes("shield") || armorType.includes("shield") || slot.includes("shield");
  if (isShield) return false;
  return subtype.includes("armor") || armorType.includes("light") || armorType.includes("medium") || armorType.includes("heavy") || slot.includes("armor") || name.includes("armor");
}

function getArmorCategory(item) {
  const values = [
    getPropertySafe(item, "system.armor.type"),
    getPropertySafe(item, "system.armorType"),
    getPropertySafe(item, "system.armor.category"),
    getPropertySafe(item, "system.subType"),
    getPropertySafe(item, "system.subtype")
  ].map(v => String(v ?? "").toLowerCase()).join(" ");
  if (values.includes("heavy")) return "heavy";
  if (values.includes("medium")) return "medium";
  return "light";
}

function getArmorBonus(item) {
  const candidates = [
    "system.armor.value",
    "system.armor.ac",
    "system.armorBonus",
    "system.acBonus",
    "system.attributes.ac.bonus",
    "system.bonus"
  ];
  let armor = 0;
  for (const path of candidates) {
    const value = getPropertySafe(item, path);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > armor) armor = Math.floor(numeric);
  }
  const enhancementCandidates = [
    "system.enh",
    "system.enhancement",
    "system.enhancement.value",
    "system.magicBonus",
    "system.armor.enh"
  ];
  let enhancement = 0;
  for (const path of enhancementCandidates) {
    const value = getPropertySafe(item, path);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > enhancement) enhancement = Math.floor(numeric);
  }
  return Math.max(0, armor + enhancement);
}

function getArmorFocusStep(actor) {
  if (!game.settings.get(MODULE_ID, "armorFocus")) return 0;
  const feats = actor.items?.filter?.(i => ["feat", "trait"].includes(i.type)) ?? [];
  const names = feats.map(i => String(i.name ?? "").trim().toLowerCase());
  if (names.includes(ARMOR_FOCUS_NAMES.ADVANCED)) return 3;
  if (names.includes(ARMOR_FOCUS_NAMES.IMPROVED)) return 2;
  if (names.includes(ARMOR_FOCUS_NAMES.BASIC)) return 1;
  return 0;
}

export function calculateMaxSoak(actor) {
  const items = Array.from(actor.items ?? []);
  const wornArmors = items.filter(item => itemIsArmor(item) && itemIsEquipped(item));
  let armorSoak = 0;
  let highestMultiplier = 0;
  let totalArmorAc = 0;
  const focusStep = getArmorFocusStep(actor);
  for (const item of wornArmors) {
    const category = getArmorCategory(item);
    const baseMultiplier = category === "heavy" ? 3 : category === "medium" ? 2 : 1;
    const multiplier = baseMultiplier + focusStep;
    const armorAc = getArmorBonus(item);
    totalArmorAc += armorAc;
    highestMultiplier = Math.max(highestMultiplier, multiplier);
    armorSoak += armorAc * multiplier;
  }
  const naturalArmor = getNaturalArmor(actor);
  const hitDice = getHitDice(actor);
  let naturalSoak = naturalArmor > 0 ? Math.max(Math.floor(naturalArmor / 2), 1) * hitDice : 0;
  if (naturalSoak > 0 && game.settings.get(MODULE_ID, "armorFocusNatural")) naturalSoak += focusStep * hitDice;
  return {
    max: clampNumber(armorSoak + naturalSoak),
    armorSoak: clampNumber(armorSoak),
    naturalSoak: clampNumber(naturalSoak),
    armorMultiplier: clampNumber(highestMultiplier),
    armorAc: clampNumber(totalArmorAc),
    naturalArmor: clampNumber(naturalArmor),
    hitDice: clampNumber(hitDice)
  };
}

export function getActorName(actor) {
  return actor?.name ?? game.i18n.localize(`${MODULE_ID}.unknownActor`);
}
