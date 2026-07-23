export const MODULE_ID = "armor-soak-pool";
export const FLAG_SCOPE = MODULE_ID;

export const FLAGS = {
  CURRENT: "current",
  MAX: "max",
  ARMOR_SOAK: "armorSoak",
  NATURAL_SOAK: "naturalSoak",
  ARMOR_MULTIPLIER: "armorMultiplier",
  ARMOR_AC: "armorAc",
  NATURAL_ARMOR: "naturalArmor",
  HIT_DICE: "hitDice",
  ENABLED: "enabled",
  AUTO_REFILL: "autoRefill",
  LAST_CALCULATED: "lastCalculated",
  LAST_REFILL_KEY: "lastRefillKey"
};

export const SETTINGS = {
  ENABLED: "enabled",
  AUTO_REFILL: "autoRefill",
  REFILL_TIMING: "refillTiming",
  DAMAGE_DIALOG: "damageDialog",
  PATCH_DAMAGE: "patchDamage",
  ARMOR_FOCUS: "armorFocus",
  ARMOR_FOCUS_NATURAL: "armorFocusNatural",
  CHAT_DAMAGE: "chatDamage",
  CHAT_REFILL: "chatRefill",
  CHAT_ADJUST: "chatAdjust",
  SHOW_SHEET: "showSheet",
  TOKEN_RESOURCE: "tokenResource",
  PLAYER_ADJUST: "playerAdjust",
  PLAYER_REFILL: "playerRefill",
  ALLOW_OVERFLOW: "allowOverflow",
  DEBUG: "debug"
};

export const REFILL_TIMINGS = {
  START: "start",
  END: "end",
  MANUAL: "manual"
};

export const HOOKS = {
  CALCULATED: "armorSoakPool.calculated",
  REFILLED: "armorSoakPool.refilled",
  DAMAGE_APPLIED: "armorSoakPool.damageApplied",
  ADJUSTED: "armorSoakPool.adjusted",
  ENABLED_CHANGED: "armorSoakPool.enabledChanged"
};

export const ARMOR_FOCUS_NAMES = {
  BASIC: "armor focus",
  IMPROVED: "improved armor focus",
  ADVANCED: "advanced armor focus"
};
