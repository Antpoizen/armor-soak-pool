export const FormApplicationBase = globalThis.FormApplication ?? foundry?.appv1?.api?.FormApplication;
export const DialogBase = globalThis.Dialog ?? foundry?.appv1?.api?.Dialog;

export function asJQuery(html) {
  if (html?.jquery || html?.find) return html;
  if (html instanceof HTMLElement) return $(html);
  if (Array.isArray(html) || html instanceof NodeList) return $(html);
  if (html?.[0] instanceof HTMLElement) return $(html);
  return $(html ?? []);
}

export async function renderTemplateCompat(path, data = {}) {
  const render = foundry?.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  if (typeof render !== "function") throw new Error("Foundry renderTemplate helper is unavailable.");
  return render(path, data);
}

export function saveDataToFileCompat(data, type, filename) {
  if (typeof globalThis.saveDataToFile === "function") return globalThis.saveDataToFile(data, type, filename);
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
