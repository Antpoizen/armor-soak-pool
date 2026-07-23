import { MODULE_ID } from "./constants.js";
import { getSoakData, setSoakFlagData } from "./data.js";
import { recalculateSoak, refillSoak } from "./api.js";

export class ArmorSoakGMTools extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "armor-soak-gm-tools",
      title: game.i18n.localize(`${MODULE_ID}.gmTools.title`),
      template: `modules/${MODULE_ID}/templates/gm-tools.hbs`,
      classes: ["pf1", "armor-soak-gm-tools"],
      width: 720,
      height: "auto",
      resizable: true
    });
  }

  async getData(options = {}) {
    const actors = Array.from(game.actors ?? []).map(actor => { const soak = getSoakData(actor); return { actor, soak, invalid: soak.current > soak.max }; });
    return { actors, isGM: game.user.isGM };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='recalculate-all']").on("click", () => this.recalculateAll());
    html.find("[data-action='refill-combatants']").on("click", () => this.refillCombatants());
    html.find("[data-action='clear-all']").on("click", () => this.clearAll());
    html.find("[data-action='export']").on("click", () => this.exportData());
    html.find("[data-action='import']").on("click", () => this.importData());
    html.find("[data-action='reset-flags']").on("click", () => this.resetFlags());
  }

  /**
   * Settings menus registered with game.settings.registerMenu in Foundry VTT v12
   * must be backed by FormApplication or ApplicationV2. This app does not submit
   * a form, but extending FormApplication keeps the menu compatible with v12.331.
   */
  async _updateObject(_event, _formData) {
    return undefined;
  }

  async recalculateAll() {
    if (!game.user.isGM) return;
    for (const actor of game.actors ?? []) await recalculateSoak(actor, { preserveRatio: false, refill: false, chat: false });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.gmTools.recalculated`));
    this.render(false);
  }

  async refillCombatants() {
    if (!game.user.isGM) return;
    for (const combatant of game.combat?.combatants ?? []) if (combatant.actor) await refillSoak(combatant.actor, { chat: false, automatic: true });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.gmTools.refilled`));
    this.render(false);
  }

  async clearAll() {
    if (!game.user.isGM) return;
    for (const actor of game.actors ?? []) await setSoakFlagData(actor, { current: 0, max: 0, armorSoak: 0, naturalSoak: 0 });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.gmTools.cleared`));
    this.render(false);
  }

  exportData() {
    const data = Array.from(game.actors ?? []).map(actor => ({ id: actor.id, name: actor.name, flags: actor.flags?.[MODULE_ID] ?? {} }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveDataToFile(blob, "application/json", "armor-soak-pool-export.json");
  }

  importData() {
    const content = `<form><div class="form-group stacked"><label>${game.i18n.localize(`${MODULE_ID}.gmTools.importLabel`)}</label><textarea name="json" rows="10"></textarea></div></form>`;
    new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.gmTools.importTitle`),
      content,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: game.i18n.localize(`${MODULE_ID}.common.import`),
          callback: async html => {
            try {
              const parsed = JSON.parse(html.find('[name="json"]').val());
              if (!Array.isArray(parsed)) throw new Error("Expected an array");
              for (const entry of parsed) {
                const actor = game.actors.get(entry.id);
                if (actor && entry.flags && typeof entry.flags === "object") await setSoakFlagData(actor, entry.flags);
              }
              this.render(false);
            } catch (error) {
              ui.notifications.error(game.i18n.format(`${MODULE_ID}.errors.importFailed`, { error: error.message }));
            }
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize(`${MODULE_ID}.common.cancel`) }
      }
    }).render(true);
  }

  async resetFlags() {
    if (!game.user.isGM) return;
    const confirm = await Dialog.confirm({ title: game.i18n.localize(`${MODULE_ID}.gmTools.resetTitle`), content: `<p>${game.i18n.localize(`${MODULE_ID}.gmTools.resetConfirm`)}</p>` });
    if (!confirm) return;
    for (const actor of game.actors ?? []) await actor.update({ [`flags.-=${MODULE_ID}`]: null });
    this.render(false);
  }
}
