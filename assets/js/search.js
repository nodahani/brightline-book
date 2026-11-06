/* ==========================================================================
   search.js — جست‌وجوی تمام‌متنِ فارسی
   جزئیاتِ زبان فارسی که بیشتر سایت‌ها نادیده می‌گیرند:
     ی/ي، ک/ك، آ/ا، نیم‌فاصله، اعراب و ارقام فارسی/لاتین
   ========================================================================== */

import { slugify, stripHtml } from "./content.js";

const ARABIC_TO_PERSIAN = [
  [/[\u064A\u0649]/g, "\u06CC"], // ي، ى → ی
  [/\u0643/g, "\u06A9"], // ك → ک
  [/[\u0622\u0623\u0625]/g, "\u0627"], // آ، أ، إ → ا
  [/[\u0629]/g, "\u0647"], // ة → ه
  [/[\u064B-\u0652\u0670]/g, ""], // اعراب و تنوین
  [/[\u200C\u200E\u200F\u202A-\u202E\uFEFF]/g, " "], // نیم‌فاصله و کنترلها
  [/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))],
  [/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))],
];

/** متن را برای مقایسه یکسان می‌کند. */
export function normalize(text = "") {
  return ARABIC_TO_PERSIAN.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    String(text),
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const escapeText = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * فهرستِ جست‌وجو را یک‌بار از کتاب می‌سازد.
 * @param {{ chapters: object[] }} book
 */
export function buildIndex(book) {
  return book.chapters.map((chapter) => {
    const holder = document.createElement("div");
    holder.innerHTML = chapter.body || "";

    // هر بند را با slug عنوانِ بالادستش ذخیره می‌کنیم تا نتیجهٔ جست‌وجو
    // بتواند مستقیم به همان بخش بپرد، نه به اول فصل.
    const blocks = [];
    let slug = null;

    for (const node of holder.children) {
      if (/^H[23]$/.test(node.tagName)) {
        slug = slugify(node.textContent || "") || null;
      }
      const text = stripHtml(node.outerHTML);
      if (text.length > 1) blocks.push({ text, slug });
    }

    return {
      id: chapter.id,
      title: chapter.title,
      label: chapter.label || "",
      blocks,
    };
  });
}

/**
 * جست‌وجو در فهرست؛ برای هر بندِ منطبق یک نتیجه جدا برمی‌گرداند.
 * @param {ReturnType<typeof buildIndex>} index
 * @param {string} query
 * @param {{ limit?: number }} options
 * @returns {{ id: string, slug: string|null, where: string, text: string }[]}
 */
export function search(index, query, { limit = 40 } = {}) {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const results = [];

  for (const entry of index) {
    if (normalize(entry.title).includes(needle)) {
      results.push({
        id: entry.id,
        slug: null,
        where: `فصل ${entry.label} · عنوان`,
        text: entry.title,
      });
    }

    for (const block of entry.blocks) {
      const position = normalize(block.text).indexOf(needle);
      if (position === -1) continue;

      const from = Math.max(0, position - 55);
      const to = Math.min(block.text.length, position + needle.length + 75);

      results.push({
        id: entry.id,
        slug: block.slug,
        where: `فصل ${entry.label} · ${entry.title}`,
        text: `${from > 0 ? "…" : ""}${block.text.slice(from, to)}${to < block.text.length ? "…" : ""}`,
      });

      if (results.length >= limit) return results;
    }
  }

  return results;
}

/**
 * یک متنِ خامِ نتیجه را امن می‌کند و واژهٔ جست‌وجوشده را با <mark> علامت می‌زند.
 * @param {string} text
 * @param {string} query
 */
export function highlight(text, query) {
  const safe = escapeText(text);
  const needle = escapeText(query).trim();

  if (!needle) return safe;

  // روی متنِ امن‌شده جست‌وجو می‌کنیم تا تگ‌های HTML در وسط واژه نشکنند
  return safe.replace(
    new RegExp(escapeRegExp(needle), "gi"),
    (match) => `<mark>${match}</mark>`,
  );
}
