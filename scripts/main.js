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
  if (game.settings.get(MODULE_ID, "damageDialog") && (game.settings.get(MODULE_ID, "patchDamage") || game.modules.get("pf1-automate-damage")?.active)) patchActorDamageWorkflow();
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
  if (originalApplyDamage) return;
  const target = "pf1.documents.actor.ActorPF.prototype.applyDamage";

  if (globalThis.libWrapper) {
    try {
      // The Soak dialog sometimes intentionally consumes the damage without passing it
      // to PF1e (Apply to Soak / Cancel). libWrapper.WRAPPER requires the wrapped
      // method to be called every time, so this must be MIXED.
      const wrapperType = libWrapper.MIXED ?? libWrapper.WRAPPER;
      libWrapper.register(MODULE_ID, target, armorSoakApplyDamageWrapper, wrapperType);
      originalApplyDamage = "libWrapper";
      console.log(`${MODULE_ID} | Damage intercept registered on ${target} using libWrapper ${wrapperType === libWrapper.MIXED ? "MIXED" : "WRAPPER"}.`);
      return;
    } catch (error) {
      console.warn(`${MODULE_ID} | libWrapper damage intercept failed; trying direct fallback.`, error);
    }
  }

  const proto = foundry.utils.getProperty(globalThis, "pf1.documents.actor.ActorPF.prototype") ?? Actor?.prototype;
  if (!proto?.applyDamage) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.warnings.noDamageHook`));
    return;
  }
  originalApplyDamage = proto.applyDamage;
  proto.applyDamage = async function armorSoakDirectApplyDamage(value, config = {}) {
    return handleArmorSoakApplyDamage(this, originalApplyDamage.bind(this), value, config);
  };
  console.log(`${MODULE_ID} | Direct damage intercept enabled.`);
}

async function armorSoakApplyDamageWrapper(wrapped, value, config = {}) {
  return handleArmorSoakApplyDamage(this, wrapped.bind(this), value, config ?? {});
}

async function handleArmorSoakApplyDamage(actor, wrapped, value, config = {}) {
  if (!game.settings.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "damageDialog")) return wrapped(value, config);
  if (config?._armorSoakPoolBypass || config?.healing) return wrapped(value, config);

  const maybeAmount = Number(value?.damage ?? value?.amount ?? value);
  if (!Number.isFinite(maybeAmount) || maybeAmount <= 0) return wrapped(value, config);

  const result = await openDamageDialog(actor, maybeAmount, {
    patched: true,
    source: game.modules.get("pf1-automate-damage")?.active ? "pf1-automate-damage" : "pf1",
    originalConfig: config
  });

  if (result === null) return null;
  if (result?.normal) return wrapped(value, config);
  if (result?.remaining > 0) {
    const adjusted = adjustDamageValue(value, result.remaining);
    return wrapped(adjusted, { ...config, _armorSoakPoolBypass: true });
  }
  return result;
}

function adjustDamageValue(value, remaining) {
  if (typeof value === "number") return remaining;
  if (typeof value === "object" && value !== null) {
    const cloned = foundry.utils.deepClone(value);
    if ("damage" in cloned) cloned.damage = remaining;
    else if ("amount" in cloned) cloned.amount = remaining;
    else return remaining;
    return cloned;
  }
  return remaining;
}
