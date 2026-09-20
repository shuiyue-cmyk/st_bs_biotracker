import assert from 'node:assert/strict';
import test from 'node:test';

import { I18N_STATS, I18N_TABLES } from '../scripts/i18n_tables.js';
import { convertString } from '../scripts/locale.js';
import { LOCALES, normalizeLocale } from '../scripts/state.js';

test('normalizeLocale accepts cn/tw/hk with aliases, defaults to cn', () => {
  assert.equal(normalizeLocale('cn'), 'cn');
  assert.equal(normalizeLocale('tw'), 'tw');
  assert.equal(normalizeLocale('hk'), 'hk');
  assert.equal(normalizeLocale('zh-TW'), 'tw');
  assert.equal(normalizeLocale('zh_HK'), 'hk');
  assert.equal(normalizeLocale('Taiwan'), 'tw');
  assert.equal(normalizeLocale(undefined), 'cn');
  assert.equal(normalizeLocale(''), 'cn');
  assert.equal(normalizeLocale('en'), 'cn');
  assert.deepEqual([...LOCALES], ['cn', 'tw', 'hk']);
});

test('convertString exact-matches keys and passes everything else through', () => {
  assert.equal(convertString('保存设置', 'tw'), '儲存設定');
  assert.equal(convertString('保存设置', 'hk'), '保存設置');
  assert.equal(convertString('保存设置', 'cn'), '保存设置');
  assert.equal(convertString('保存设置', 'xx'), '保存设置');
  // 內插變數、使用者資料不會整段等於鍵值，原樣返回
  assert.equal(convertString('已生成 露比 的衣柜补充', 'tw'), '已生成 露比 的衣柜补充');
  assert.equal(convertString('', 'tw'), '');
});

test('curated OpenCC fixups hold in both tables', () => {
  const tw = I18N_TABLES.tw;
  const hk = I18N_TABLES.hk;
  assert.equal(tw['全角色时间推进'], '全角色時間推進');
  assert.equal(tw['调整参数'], '調整參數');
  assert.equal(tw['将当前衍生类型加入提示词名录'], '將當前衍生類型加入提示詞名錄');
  assert.equal(tw['注销当前角色'], '註銷當前角色');
  assert.equal(tw['只影响本次繁育推演。可写特别关注的心理方向、过往经历、关系解释、当前是否应偏向月经期或孕期心理等。'].slice(0, 3), '只影響');
  assert.ok(tw['母体已经怀孕之后又受精一次，晚到那胎发育落后，最后一起娩出。受精时点由模型按孕龄决定。'].includes('發育'));
  assert.equal(hk['只影响本次繁育推演。可写特别关注的心理方向、过往经历、关系解释、当前是否应偏向月经期或孕期心理等。'].slice(0, 3), '只影響');
  assert.ok(hk['母体已经怀孕之后又受精一次，晚到那胎发育落后，最后一起娩出。受精时点由模型按孕龄决定。'].includes('發育'));
  assert.equal(hk['温度'], '溫度');
  assert.equal(tw['温度'], '溫度');
});

test('tables contain no locked state keys and no residual mis-conversions', () => {
  for (const locale of (['tw', 'hk'])) {
    const table = I18N_TABLES[locale];
    // B 類狀態鍵必須缺席（缺席＝不轉換）
    for (const locked of (['人类', '排卵期', '黄体期', '卵泡期', '月经期', '产后恢复'])) {
      assert.equal(Object.hasOwn(table, locked), false, `${locale} must not convert ${locked}`);
    }
    for (const [src, out] of Object.entries(table)) {
      assert.ok(src.length > 0);
      assert.ok(out.length > 0);
      for (const ch of out) {
        // 豆腐塊防線之一：全部 BMP（擴展區字一律不進表）
        assert.ok(ord(ch) < 0x10000, `${locale} non-BMP U+${ord(ch).toString(16)} in ${src}`);
      }
    }
  }
  // 誤轉殘留：兩表輸出皆不可見
  const bad = '隻髮麪着説';
  for (const locale of (['tw', 'hk'])) {
    for (const out of Object.values(I18N_TABLES[locale])) {
      for (const ch of bad) assert.equal(out.includes(ch), false, `${locale} residual ${ch} in ${out.slice(0, 20)}`);
    }
  }
});

function ord(ch) {
  return ch.codePointAt(0);
}

test('table stats match actual key counts', () => {
  assert.equal(Object.keys(I18N_TABLES.tw).length, I18N_STATS.entries);
  assert.equal(Object.keys(I18N_TABLES.hk).length, I18N_STATS.entries);
  assert.ok(I18N_STATS.entries > 200);
});
