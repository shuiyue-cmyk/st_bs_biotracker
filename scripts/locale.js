import { I18N_TABLES } from './i18n_tables.js';

/**
 * 靜態面板繁化（fork 自用第一階段：只處理 settings.html 靜態鉻文案）。
 *
 * 設計要點：
 * - 精確匹配：只有整個文字節點（去空白後）或屬性值完整等於表鍵才轉換；
 *   內插變數、使用者資料原則上不會整段等於鍵值，碰不到轉換。
 * - B 類字串（狀態鍵、列舉值、人類等）根本不在表裡，天生不轉。
 * - 永遠從暫存原文轉換：中／台／港互切不疊加、不漂移；切回簡體還原原文。
 * - 絕不碰：value/name/id/class 屬性、textarea 與 input 內容、script/style。
 * - option 顯示文字只在有顯式 value 屬性時才轉（value 本體不動；
 *   無 value 的動態 option 由 phase 2 的 t() 處理）。
 * - 動態使用者資料容器（見 I18N_DYNAMIC_SELECTOR）整個跳過。
 */

const CONVERTIBLE_ATTRS = ['placeholder', 'title', 'aria-label'];

// JS 填充的使用者資料容器：角色／技能／世界書／衣櫃名錄、名單類 select 等。
// 靜態 placeholder（多半帶顯式 value=""）不受影響，轉換照常。
export const I18N_DYNAMIC_SELECTOR = [
  '#bs-bt-skill-catalog-list',
  '#bs-bt-skill-detail-characters',
  '#bs-bt-track-character-list',
  '#bs-bt-track-content',
  '#bs-bt-track-last-call',
  '#bs-bt-worldbook-entry-list',
  '#bs-bt-global-worldbook-entry-list',
  '#bs-bt-home-full-state-list',
  '#bs-bt-wardrobe-list',
  '#bs-bt-wardrobe-add-page',
  '#bs-bt-prompt-toggles',
  '#bs-bt-register-source',
  '#bs-bt-child-move-source',
  '#bs-bt-child-move-target',
  '#bs-bt-race-select',
  '#bs-bt-derived-select',
  '#bs-bt-register-race-palette-anchor',
].join(',');

const originalTextByNode = new WeakMap();

function conversionTable(locale) {
  if (locale !== 'tw' && locale !== 'hk') return null;
  return I18N_TABLES[locale] || null;
}

function lookup(table, text) {
  if (!table || typeof text !== 'string') return undefined;
  const key = text.trim();
  if (!key) return undefined;
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** 精確匹配單串轉換（phase 2 動態文案用）；非 tw/hk 或無鍵原樣返回。 */
export function convertString(text, locale) {
  if (typeof text !== 'string') return text;
  const out = lookup(conversionTable(locale), text);
  return out === undefined ? text : out;
}

function insideDynamic(node) {
  const parent = node.parentElement;
  if (!parent) return false;
  try {
    return Boolean(parent.closest(I18N_DYNAMIC_SELECTOR));
  } catch {
    return false;
  }
}

function isSkippableTextParent(tagName) {
  return tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'TEXTAREA';
}

function convertTextNode(node, table) {
  const parent = node.parentElement;
  if (!parent || insideDynamic(node)) return;
  if (isSkippableTextParent(parent.tagName)) return;
  if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) return;
  if (!originalTextByNode.has(node)) originalTextByNode.set(node, node.nodeValue);
  const src = originalTextByNode.get(node);
  if (table === null) {
    if (node.nodeValue !== src) node.nodeValue = src;
    return;
  }
  const key = src.trim();
  const out = key ? table[key] : undefined;
  if (out === undefined || !Object.hasOwn(table, key)) return;
  const next = src.replace(key, out);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function attrStashKey(attr) {
  return `data-bsbt-i18n-src-${attr}`;
}

function convertAttr(element, attr, table) {
  if (insideDynamic({ parentElement: element })) return;
  const current = element.getAttribute(attr);
  if (current === null) return;
  const stashKey = attrStashKey(attr);
  let src = element.getAttribute(stashKey);
  if (src === null) {
    src = current;
    element.setAttribute(stashKey, src);
  }
  if (table === null) {
    if (current !== src) element.setAttribute(attr, src);
    return;
  }
  const key = src.trim();
  if (key && Object.hasOwn(table, key)) {
    const out = table[key];
    if (current !== out) element.setAttribute(attr, out);
  } else if (current !== src) {
    element.setAttribute(attr, src);
  }
}

/** 對面板子樹做一次靜態繁化（或切回簡體還原）。無 document 環境下為空操作。 */
export function applyLocaleToPanel(root, locale) {
  if (typeof document === 'undefined' || !root || typeof root.querySelectorAll !== 'function') return;
  const table = conversionTable(locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node);
    node = walker.nextNode();
  }
  for (const textNode of textNodes) convertTextNode(textNode, table);
  const selector = CONVERTIBLE_ATTRS.map((attr) => `[${attr}]`).join(',');
  for (const element of root.querySelectorAll(selector)) {
    for (const attr of CONVERTIBLE_ATTRS) convertAttr(element, attr, table);
  }
}
