import { UI_DICTIONARY } from "./uiDictionary";
import type { Language } from "./i18n";

const pairs = new Map(UI_DICTIONARY.map(({ pt, en }) => [pt, en]));
const originals = new WeakMap<Text, string>();
const attributeNames = ["placeholder", "aria-label", "title", "alt"];

function translateTextNode(node: Text, language: Language) {
  if (!originals.has(node)) originals.set(node, node.nodeValue || "");
  const original = originals.get(node) || "";
  const trimmed = original.trim();
  const translated = language === "en-US" ? pairs.get(trimmed) : undefined;
  if (translated && translated !== trimmed) {
    node.nodeValue = original.replace(trimmed, translated);
  } else if (language === "pt-BR") {
    node.nodeValue = original;
  }
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
      for (const name of attributeNames) {
        const value = element.getAttribute(name);
        if (!value) continue;
        const translated = language === "en-US" ? pairs.get(value.trim()) : undefined;
        if (translated && translated !== value) element.setAttribute(name, value.replace(value.trim(), translated));
      }
    }
  }
}

export function watchRenderedInterface(language: Language) {
  translateRenderedInterface(language);
  const observer = new MutationObserver(() => translateRenderedInterface(language));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
