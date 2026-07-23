import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerActorSheetHooks } from "./actor-sheet.js";
import { registerCombatHooks } from "./combat.js";
import { ArmorSoakPoolAPI, recalculateSoak } from "./api.js";
import { runMigration } from "./migration.js";
import { openDamageDialog } from "./damage-dialog.js";

let originalApplyDamage = null;

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MODULE_ID).api = ArmorSoakPoolAPI;
  console.log(`${MODULE_ID} | Initialized for Foundry VTT v12 build 331 and PF1e 11.11.`);
});

Hooks.once("ready", async () => {
  if (game.system.id !== "pf1") {
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.errors.wrongSystem`));
    return;
  }
  registerActorSheetHooks();
  registerCombatHooks();
  registerManualMacroHelpers();
  if (game.settings.get(MODULE_ID, "patchDamage")) patchActorDamageWorkflow();
  await runMigration();
});

Hooks.on("updateActor", async (actor, changed) => {
  if (!game.user.isGM || !game.settings.get(MODULE_ID, "enabled")) return;
  if (!changed?.items && !changed?.system) return;
  await recalculateSoak(actor, { preserveRatio: true, chat: false });
});

Hooks.on("createItem", async (item) => { if (game.user.isGM && item.actor) await recalculateSoak(item.actor, { preserveRatio: true, chat: false }); });
Hooks.on("updateItem", async (item) => { if (game.user.isGM && item.actor) await recalculateSoak(item.actor, { preserveRatio: true, chat: false }); });
Hooks.on("deleteItem", async (item) => { if (game.user.isGM && item.actor) await recalculateSoak(item.actor, { preserveRatio: true, chat: false }); });

function registerManualMacroHelpers() {
  window.ArmorSoakPool = ArmorSoakPoolAPI;
}

function patchActorDamageWorkflow() {
  if (originalApplyDamage || !Actor.prototype) return;
  const method = Actor.prototype.applyDamage ? "applyDamage" : null;
  if (!method) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.warnings.noDamageHook`));
    return;
  }
  originalApplyDamage = Actor.prototype[method];
  Actor.prototype[method] = async function patchedApplyDamage(...args) {
    if (!game.settings.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "damageDialog")) return originalApplyDamage.call(this, ...args);
    const maybeAmount = Number(args[0]?.damage ?? args[0]?.amount ?? args[0]);
    if (!Number.isFinite(maybeAmount) || maybeAmount <= 0) return originalApplyDamage.call(this, ...args);
    const result = await openDamageDialog(this, maybeAmount, { patched: true });
    if (result === null) return null;
    if (result?.normal) return originalApplyDamage.call(this, ...args);
    if (result?.remaining > 0) {
      const adjusted = adjustDamageArgs(args, result.remaining);
      if (adjusted) return originalApplyDamage.call(this, ...adjusted);
      ui.notifications.info(game.i18n.format(`${MODULE_ID}.info.splitRemaining`, { remaining: result.remaining }));
      return result;
    }
    return result;
  };
  console.log(`${MODULE_ID} | Optional Actor.applyDamage patch enabled.`);
}

function adjustDamageArgs(args, remaining) {
  const cloned = foundry.utils.deepClone(args);
  if (typeof cloned[0] === "number") {
    cloned[0] = remaining;
    return cloned;
  }
  if (typeof cloned[0] === "object" && cloned[0] !== null) {
    if ("damage" in cloned[0]) { cloned[0].damage = remaining; return cloned; }
    if ("amount" in cloned[0]) { cloned[0].amount = remaining; return cloned; }
  }
  return null;
}
