import { MODULE_ID } from "./constants.js";
import { getSoakData, canControlActor } from "./data.js";
import { recalculateSoak, refillSoak, setSoakEnabled } from "./api.js";
import { openDamageDialog, openManualAdjustDialog } from "./damage-dialog.js";

export function registerActorSheetHooks() {
  Hooks.on("renderActorSheet", injectSoakPanel);
}

async function injectSoakPanel(app, html, data) {
  if (!game.settings.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "showSheet")) return;
  const actor = app.actor;
  if (!actor) return;
  const jq = html instanceof jQuery ? html : $(html);
  if (jq.find(".armor-soak-panel").length) return;
  const soak = getSoakData(actor);
  const pct = soak.max > 0 ? Math.max(0, Math.min(100, Math.round((soak.current / soak.max) * 100))) : 0;
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/actor-soak-panel.hbs`, {
    actor,
    soak,
    pct,
    canAdjust: canControlActor(actor, "adjust"),
    canRefill: canControlActor(actor, "refill"),
    enabled: soak.enabled
  });
  const target = findInjectionTarget(jq);
  if (target?.length) target.after(content);
  else jq.find("form").prepend(content);
  activatePanelListeners(jq, actor);
}

function findInjectionTarget(html) {
  const selectors = [
    ".attributes-root .health",
    ".attributes .health",
    ".health-details",
    ".resources",
    ".attributes",
    ".sidebar"
  ];
  for (const selector of selectors) {
    const found = html.find(selector).first();
    if (found.length) return found;
  }
  return null;
}

function activatePanelListeners(html, actor) {
  html.find(".armor-soak-recalculate").on("click", ev => { ev.preventDefault(); recalculateSoak(actor, { chat: true }); });
  html.find(".armor-soak-refill").on("click", ev => { ev.preventDefault(); refillSoak(actor, { chat: true }); });
  html.find(".armor-soak-adjust").on("click", ev => { ev.preventDefault(); openManualAdjustDialog(actor); });
  html.find(".armor-soak-damage").on("click", ev => { ev.preventDefault(); openDamageDialog(actor, 0); });
  html.find(".armor-soak-enabled").on("change", ev => setSoakEnabled(actor, ev.currentTarget.checked));
}
