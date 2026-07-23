import { MODULE_ID } from "./constants.js";
import { recalculateSoak } from "./api.js";

export async function runMigration() {
  const key = "migrationVersion";
  const current = game.settings.get(MODULE_ID, key);
  if (current === "1.0.0") return;
  if (game.user.isGM) {
    for (const actor of game.actors ?? []) {
      if (actor.flags?.[MODULE_ID]) continue;
      await recalculateSoak(actor, { preserveRatio: false, refill: false, chat: false });
    }
    await game.settings.set(MODULE_ID, key, "1.0.0");
  }
}
