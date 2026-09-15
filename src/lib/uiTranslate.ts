import { UI_DICTIONARY } from "./uiDictionary";
import type { Language } from "./i18n";

const pairs = new Map(UI_DICTIONARY.map(({ pt, en }) => [pt, en]));
const originals = new WeakMap<Text, string>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
const attributeNames = ["placeholder", "aria-label", "title", "alt"];

function translateTextNode(node: Text, language: Language) {
  if (!originals.has(node)) originals.set(node, node.nodeValue || "");
  const original = originals.get(node) || "";
  const trimmed = original.trim();
  const translated = language === "en-US" ? pairs.get(trimmed) : undefined;
  const next = translated ? original.replace(trimmed, translated) : original;
  if (node.nodeValue !== next) node.nodeValue = next;
}

export function translateRenderedInterface(language: Language, root: ParentNode = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    translateTextNode(node, language);
  }
  if (root instanceof Element) {
    const elements = [root, ...Array.from(root.querySelectorAll("*"))];
    for (const element of elements) {
      let previous = translatedAttributes.get(element);
      if (!previous) { previous = new Map(); translatedAttributes.set(element, previous); }
      for (const name of attributeNames) {
        const value = element.getAttribute(name);
        if (value === null) continue;
        const source = previous.get(name) || value;
        if (!previous.has(name)) previous.set(name, source);
        const translated = language === "en-US" ? pairs.get(source.trim()) : undefined;
        const next = translated ? source.replace(source.trim(), translated) : source;
        if (value !== next) element.setAttribute(name, next);
      }
    }
  }
}

export function watchRenderedInterface(language: Language) {
  let scheduled = false;
  let active = false;
  const run = () => {
    scheduled = false;
    if (active || !document.body) return;
    active = true;
    try { translateRenderedInterface(language); } finally { active = false; }
  };
  run();
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
