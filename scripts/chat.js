import { MODULE_ID } from "./constants.js";
import { getActorName } from "./data.js";

function activeGmWhisperIds() {
  const active = game.users.filter(u => u.isGM && u.active).map(u => u.id);
  if (active.length) return active;
  return game.users.filter(u => u.isGM).map(u => u.id);
}

function actorOwnerWhisperIds(actor) {
  const owners = game.users
    .filter(u => !u.isGM && u.active && actor?.testUserPermission?.(u, "OWNER"))
    .map(u => u.id);
  return owners.length ? owners : activeGmWhisperIds();
}

function getWhisperIds(actor, type) {
  if (type === "damage") return activeGmWhisperIds();
  if (type === "refill") return actorOwnerWhisperIds(actor);
  if (type === "adjust" || type === "recalculate") return activeGmWhisperIds();
  return [];
}

export async function renderSoakChatCard(actor, type, payload = {}) {
  const template = `modules/${MODULE_ID}/templates/chat-card.hbs`;
  const titleKey = `${MODULE_ID}.chat.${type}`;
  const old = payload.old ?? {};
  const data = payload.data ?? {};
  const absorbed = Number(payload.absorbed ?? 0);
  const overflow = Number(payload.overflow ?? 0);
  const restored = Math.max(0, Number(data.current ?? 0) - Number(old.current ?? 0));
  const html = await renderTemplate(template, {
    type,
    title: game.i18n.localize(titleKey),
    actorName: getActorName(actor),
    old,
    data,
    amount: payload.amount ?? null,
    absorbed,
    overflow,
    restored,
    reason: payload.reason ? (game.i18n.localize(`${MODULE_ID}.results.${payload.reason}`) || payload.reason) : null,
    automatic: payload.automatic ?? false,
    isDamage: type === "damage",
    isRefill: type === "refill",
    isAdjust: type === "adjust",
    isRecalculate: type === "recalculate",
    showAbsorbed: type === "damage",
    showOverflow: type === "damage" && overflow > 0,
    showRestored: type === "refill"
  });
  const whisper = getWhisperIds(actor, type);
  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    whisper
  });
}
