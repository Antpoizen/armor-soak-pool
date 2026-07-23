import { MODULE_ID } from "./constants.js";
import { applyDamageToSoak, setSoak } from "./api.js";
import { canControlActor, clampNumber, getSoakData } from "./data.js";

export async function openDamageDialog(actor, amount = 0, options = {}) {
  if (!actor) return null;
  if (!canControlActor(actor, "adjust")) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.warnings.noPermission`));
    return null;
  }
  amount = clampNumber(amount);
  const data = getSoakData(actor);
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/damage-dialog.hbs`, { actor, amount, data, options });
  return new Promise((resolve) => {
    const dialog = new Dialog({
      title: game.i18n.format(`${MODULE_ID}.dialogs.damage.title`, { name: actor.name }),
      content,
      buttons: {
        soak: {
          icon: '<i class="fas fa-shield-alt"></i>',
          label: game.i18n.localize(`${MODULE_ID}.dialogs.damage.applySoak`),
          callback: async (html) => {
            const value = Number(html.find('[name="amount"]').val() ?? amount);
            resolve(await applyDamageToSoak(actor, value, { reason: "applyToSoak" }));
          }
        },
        normal: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: game.i18n.localize(`${MODULE_ID}.dialogs.damage.applyNormal`),
          callback: () => resolve({ normal: true, amount })
        },
        split: {
          icon: '<i class="fas fa-divide"></i>',
          label: game.i18n.localize(`${MODULE_ID}.dialogs.damage.split`),
          callback: async (html) => {
            const total = clampNumber(html.find('[name="amount"]').val() ?? amount);
            const soakAmount = clampNumber(html.find('[name="soakAmount"]').val() ?? 0, 0, total);
            const result = await applyDamageToSoak(actor, soakAmount, { reason: "split" });
            result.remaining = Math.max(0, total - soakAmount);
            ui.notifications.info(game.i18n.format(`${MODULE_ID}.info.splitRemaining`, { remaining: result.remaining }));
            resolve(result);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize(`${MODULE_ID}.common.cancel`),
          callback: () => resolve(null)
        }
      },
      default: "soak",
      close: () => resolve(null)
    }, { classes: ["pf1", "armor-soak-dialog"], width: 460 });
    dialog.render(true);
  });
}

export async function openManualAdjustDialog(actor) {
  const data = getSoakData(actor);
  const content = `
  <form class="armor-soak-manual-form">
    <div class="form-group"><label>${game.i18n.localize(`${MODULE_ID}.fields.current`)}</label><input type="number" name="current" value="${data.current}" min="0" step="1"></div>
    <div class="form-group"><label>${game.i18n.localize(`${MODULE_ID}.fields.delta`)}</label><input type="number" name="delta" value="0" step="1"></div>
  </form>`;
  return new Dialog({
    title: game.i18n.format(`${MODULE_ID}.dialogs.adjust.title`, { name: actor.name }),
    content,
    buttons: {
      set: { icon: '<i class="fas fa-save"></i>', label: game.i18n.localize(`${MODULE_ID}.common.set`), callback: html => setSoak(actor, Number(html.find('[name="current"]').val() || 0)) },
      adjust: { icon: '<i class="fas fa-plus-minus"></i>', label: game.i18n.localize(`${MODULE_ID}.common.adjust`), callback: html => setSoak(actor, data.current + Number(html.find('[name="delta"]').val() || 0)) },
      cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize(`${MODULE_ID}.common.cancel`) }
    },
    default: "set"
  }, { classes: ["pf1", "armor-soak-dialog"], width: 420 }).render(true);
}
