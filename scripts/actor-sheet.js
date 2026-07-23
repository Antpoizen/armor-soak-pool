import { MODULE_ID } from "./constants.js";
import { getSoakData, canControlActor } from "./data.js";
import { recalculateSoak, refillSoak, setSoak, setSoakEnabled } from "./api.js";

export function registerActorSheetHooks() {
  Hooks.on("renderActorSheet", injectSoakPanel);
}

async function injectSoakPanel(app, html, data) {
  if (!game.settings.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "showSheet")) return;
  const actor = app.actor;
  if (!actor) return;

  const jq = html instanceof jQuery ? html : $(html);
  jq.find(".armor-soak-panel").remove();

  // Recalculate on render for GMs so the displayed maximum follows armor, HD,
  // natural armor, and Armor Focus changes without requiring a sheet button.
  if (game.user.isGM) await recalculateSoak(actor, { preserveRatio: false, chat: false, render: false });

  const soak = getSoakData(actor);
  const pct = soak.max > 0 ? Math.max(0, Math.min(100, Math.round((soak.current / soak.max) * 100))) : 0;
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/actor-soak-panel.hbs`, {
    actor,
    soak,
    pct,
    canAdjust: canControlActor(actor, "adjust"),
    canRefill: canControlActor(actor, "refill"),
    enabled: soak.enabled,
    allowOverflow: game.settings.get(MODULE_ID, "allowOverflow")
  });

  const insertion = findInjectionTarget(jq);
  if (insertion?.target?.length) {
    if (insertion.method === "before") insertion.target.before(content);
    else if (insertion.method === "prepend") insertion.target.prepend(content);
    else insertion.target.after(content);
  } else jq.find("form").prepend(content);

  activatePanelListeners(jq, actor);
}

function directText(element) {
  const clone = $(element).clone();
  clone.children().remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

function findInjectionTarget(html) {
  // Prefer placing the panel immediately above the Defenses section. This avoids
  // the PF1e health/speed flex row, where a third-party panel can be squeezed
  // into a narrow column between Vigor/Wounds and Speed.
  const defenseSelectors = [
    ".defenses",
    ".defense",
    ".defense-container",
    ".defense-section",
    ".ac-details",
    ".ac"
  ];
  for (const selector of defenseSelectors) {
    const found = html.find(selector).first();
    if (found.length) return { target: found, method: "before" };
  }

  const textHeader = html.find("h1, h2, h3, h4, header, .section-header, .block-header, .pf1-block-header, .attribute-header")
    .filter((_, el) => /^defenses$/i.test(directText(el)))
    .first();
  if (textHeader.length) return { target: textHeader, method: "before" };

  // Fallback: find a visible element whose own text is exactly Defenses, but do
  // not choose large wrappers whose descendants merely contain the word.
  const anyDefenseLabel = html.find("*")
    .filter((_, el) => /^defenses$/i.test(directText(el)))
    .first();
  if (anyDefenseLabel.length) return { target: anyDefenseLabel, method: "before" };

  // If no defense anchor exists on a specific sheet, place the panel after a
  // full-width attribute/root block instead of inside an individual resource.
  const fallbackSelectors = [".attributes-root", ".attributes", ".tab[data-tab='attributes']", "form"];
  for (const selector of fallbackSelectors) {
    const found = html.find(selector).first();
    if (found.length) return { target: found, method: selector === "form" ? "prepend" : "after" };
  }
  return null;
}

function activatePanelListeners(html, actor) {
  html.find(".armor-soak-refill").on("click", ev => {
    ev.preventDefault();
    refillSoak(actor, { chat: true });
  });

  html.find(".armor-soak-current").on("change", ev => {
    ev.preventDefault();
    const value = Number(ev.currentTarget.value ?? 0);
    setSoak(actor, value);
  });

  html.find(".armor-soak-enabled").on("change", ev => {
    setSoakEnabled(actor, ev.currentTarget.checked);
  });
}
