import { MODULE_ID } from "./constants.js";
import { getActorName } from "./data.js";

export async function renderSoakChatCard(actor, type, payload = {}) {
  const template = `modules/${MODULE_ID}/templates/chat-card.hbs`;
  const titleKey = `${MODULE_ID}.chat.${type}`;
  const html = await renderTemplate(template, {
    type,
    title: game.i18n.localize(titleKey),
    actorName: getActorName(actor),
    old: payload.old ?? {},
    data: payload.data ?? {},
    amount: payload.amount ?? null,
    absorbed: payload.absorbed ?? null,
    overflow: payload.overflow ?? null,
    reason: payload.reason ?? null,
    automatic: payload.automatic ?? false
  });
  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html
  });
}
