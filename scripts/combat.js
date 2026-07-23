import { MODULE_ID, REFILL_TIMINGS } from "./constants.js";
import { getSoakData, setSoakFlagData } from "./data.js";
import { refillSoak } from "./api.js";

export function registerCombatHooks() {
  Hooks.on("updateCombat", onUpdateCombat);
}

async function onUpdateCombat(combat, changed) {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "autoRefill")) return;
  const timing = game.settings.get(MODULE_ID, "refillTiming");
  if (timing === REFILL_TIMINGS.MANUAL) return;
  if (!Object.prototype.hasOwnProperty.call(changed, "turn") && !Object.prototype.hasOwnProperty.call(changed, "round")) return;

  if (timing === REFILL_TIMINGS.START) await refillCurrentCombatant(combat, "start");
  if (timing === REFILL_TIMINGS.END) await refillPreviousCombatant(combat, "end");
}

async function refillCurrentCombatant(combat, prefix) {
  const combatant = combat.combatant;
  if (!combatant?.actor) return;
  const key = `${combat.id}:${combat.round}:${combat.turn}:${prefix}`;
  const data = getSoakData(combatant.actor);
  if (!data.enabled || !data.autoRefill || data.lastRefillKey === key) return;
  await refillSoak(combatant.actor, { automatic: true, refillKey: key });
}

async function refillPreviousCombatant(combat, prefix) {
  const previousTurn = typeof combat.previous?.turn === "number" ? combat.previous.turn : null;
  if (previousTurn === null) return;
  const combatant = combat.turns?.[previousTurn];
  if (!combatant?.actor) return;
  const key = `${combat.id}:${combat.round}:${previousTurn}:${prefix}`;
  const data = getSoakData(combatant.actor);
  if (!data.enabled || !data.autoRefill || data.lastRefillKey === key) return;
  await refillSoak(combatant.actor, { automatic: true, refillKey: key });
}
