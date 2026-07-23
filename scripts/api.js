import { MODULE_ID, HOOKS } from "./constants.js";
import { calculateMaxSoak as calc, canControlActor, clampNumber, getSoakData, setSoakFlagData } from "./data.js";
import { renderSoakChatCard } from "./chat.js";
import { openDamageDialog } from "./damage-dialog.js";

export function getSoak(actor) { return getSoakData(actor).current; }
export function getMaxSoak(actor) { return getSoakData(actor).max; }
export function getSoakBreakdown(actor) { return getSoakData(actor); }
export function calculateMaxSoak(actor) { return calc(actor); }

export async function recalculateSoak(actor, { preserveRatio = false, refill = false, chat = false, render = true } = {}) {
  if (!actor || !canControlActor(actor, "adjust")) return null;
  const old = getSoakData(actor);
  const calculated = calc(actor);
  let current = old.current;
  if (refill) current = calculated.max;
  else if (preserveRatio && old.max > 0) current = Math.round((old.current / old.max) * calculated.max);
  current = clampNumber(current, 0, game.settings.get(MODULE_ID, "allowOverflow") ? Number.MAX_SAFE_INTEGER : calculated.max);
  const data = await setSoakFlagData(actor, { ...old, ...calculated, current, lastCalculated: new Date().toISOString() });
  Hooks.callAll(HOOKS.CALCULATED, actor, data, old);
  if (chat) await renderSoakChatCard(actor, "recalculate", { old, data });
  if (render) actor.sheet?.render(false);
  return data;
}

export async function setSoak(actor, value, { chat = game.settings.get(MODULE_ID, "chatAdjust"), reason = "manual" } = {}) {
  if (!actor || !canControlActor(actor, "adjust")) return null;
  const old = getSoakData(actor);
  const current = clampNumber(value, 0, game.settings.get(MODULE_ID, "allowOverflow") ? Number.MAX_SAFE_INTEGER : old.max);
  const data = await setSoakFlagData(actor, { current });
  Hooks.callAll(HOOKS.ADJUSTED, actor, data, old, { reason });
  if (chat) await renderSoakChatCard(actor, "adjust", { old, data, reason });
  actor.sheet?.render(false);
  return data;
}

export async function adjustSoak(actor, delta, options = {}) {
  const old = getSoakData(actor);
  return setSoak(actor, old.current + Number(delta || 0), options);
}

export async function refillSoak(actor, { chat = game.settings.get(MODULE_ID, "chatRefill"), automatic = false, refillKey = null } = {}) {
  if (!actor || !canControlActor(actor, automatic ? "system" : "refill")) return null;
  const old = getSoakData(actor);
  const calculated = calc(actor);
  const data = await setSoakFlagData(actor, { ...calculated, current: calculated.max, lastCalculated: new Date().toISOString(), lastRefillKey: refillKey ?? old.lastRefillKey });
  Hooks.callAll(HOOKS.REFILLED, actor, data, old, { automatic });
  if (chat && old.current !== data.current) await renderSoakChatCard(actor, "refill", { old, data, automatic });
  actor.sheet?.render(false);
  return data;
}

export async function applyDamageToSoak(actor, amount, { chat = game.settings.get(MODULE_ID, "chatDamage"), reason = "damage" } = {}) {
  if (!actor || !canControlActor(actor, "adjust")) return null;
  amount = clampNumber(amount);
  const old = getSoakData(actor);
  const absorbed = Math.min(old.current, amount);
  const overflow = Math.max(0, amount - absorbed);
  const data = await setSoakFlagData(actor, { current: old.current - absorbed });
  Hooks.callAll(HOOKS.DAMAGE_APPLIED, actor, data, old, { amount, absorbed, overflow, reason });
  if (chat) await renderSoakChatCard(actor, "damage", { old, data, amount, absorbed, overflow, reason });
  actor.sheet?.render(false);
  return { data, absorbed, overflow };
}

export function isSoakEnabled(actor) { return getSoakData(actor).enabled && game.settings.get(MODULE_ID, "enabled"); }

export async function setSoakEnabled(actor, enabled) {
  if (!actor || !canControlActor(actor, "adjust")) return null;
  const old = getSoakData(actor);
  const data = await setSoakFlagData(actor, { enabled: Boolean(enabled) });
  Hooks.callAll(HOOKS.ENABLED_CHANGED, actor, data, old);
  actor.sheet?.render(false);
  return data;
}

export const ArmorSoakPoolAPI = {
  getSoak,
  getMaxSoak,
  getSoakBreakdown,
  calculateMaxSoak,
  recalculateSoak,
  setSoak,
  adjustSoak,
  refillSoak,
  applyDamageToSoak,
  openDamageDialog,
  isSoakEnabled,
  setSoakEnabled
};
