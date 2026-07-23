import { MODULE_ID, SETTINGS, REFILL_TIMINGS } from "./constants.js";
import { ArmorSoakGMTools } from "./gm-tools.js";

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "gmTools", {
    name: `${MODULE_ID}.settings.gmTools.name`,
    label: `${MODULE_ID}.settings.gmTools.label`,
    hint: `${MODULE_ID}.settings.gmTools.hint`,
    icon: "fas fa-toolbox",
    type: ArmorSoakGMTools,
    restricted: true
  });

  registerBoolean(SETTINGS.ENABLED, true, false);
  registerBoolean(SETTINGS.AUTO_REFILL, true, false);
  game.settings.register(MODULE_ID, SETTINGS.REFILL_TIMING, {
    name: `${MODULE_ID}.settings.refillTiming.name`,
    hint: `${MODULE_ID}.settings.refillTiming.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      [REFILL_TIMINGS.START]: `${MODULE_ID}.settings.refillTiming.start`,
      [REFILL_TIMINGS.END]: `${MODULE_ID}.settings.refillTiming.end`,
      [REFILL_TIMINGS.MANUAL]: `${MODULE_ID}.settings.refillTiming.manual`
    },
    default: REFILL_TIMINGS.START
  });
  registerBoolean(SETTINGS.DAMAGE_DIALOG, true, false);
  registerBoolean(SETTINGS.PATCH_DAMAGE, true, true);
  registerBoolean(SETTINGS.ARMOR_FOCUS, true, false);
  registerBoolean(SETTINGS.ARMOR_FOCUS_NATURAL, false, false);
  registerBoolean(SETTINGS.CHAT_DAMAGE, true, false);
  registerBoolean(SETTINGS.CHAT_REFILL, true, false);
  registerBoolean(SETTINGS.CHAT_ADJUST, true, false);
  registerBoolean(SETTINGS.SHOW_SHEET, true, false);
  registerBoolean(SETTINGS.TOKEN_RESOURCE, false, false);
  registerBoolean(SETTINGS.PLAYER_ADJUST, true, false);
  registerBoolean(SETTINGS.PLAYER_REFILL, false, false);
  registerBoolean(SETTINGS.ALLOW_OVERFLOW, false, false);
  registerBoolean(SETTINGS.DEBUG, false, false);
  game.settings.register(MODULE_ID, "migrationVersion", { scope: "world", config: false, type: String, default: "0" });
}

function registerBoolean(key, defaultValue, requiresReload) {
  game.settings.register(MODULE_ID, key, {
    name: `${MODULE_ID}.settings.${key}.name`,
    hint: `${MODULE_ID}.settings.${key}.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: defaultValue,
    requiresReload
  });
}
