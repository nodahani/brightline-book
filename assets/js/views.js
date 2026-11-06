/* ==========================================================================
   views.js — ساختِ HTML هر بخش
   این ماژول چیزی را به صفحه «نمی‌چسباند»؛ فقط رشتهٔ HTML برمی‌گرداند.
   همین کار تست و جایگزینی‌اش را ساده می‌کند.
   ========================================================================== */

import { fa, readingMinutes, routeIndex, slugify, wordCount } from "./content.js";

/** متن را برای درج در HTML امن می‌کند. */
export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** آیکون خطی از اسپرایت تعریف‌شده در index.html. */
export const icon = (name, className = "") =>
  `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

/* ---------- صفحهٔ عنوان ---------- */

export function coverView(book) {
  const { meta, chapters } = book;
  const first = chapters[0];

  return `
    <div class="doc-title">
      <p class="doc-title__eyebrow">${escapeHtml(meta.siteName || "")}</p>
      <h1 class="doc-title__heading">${escapeHtml(meta.title || "")}</h1>
      ${meta.subtitle ? `<p class="doc-title__subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
      <p class="doc-title__meta">
        ${meta.author ? `<span>${escapeHtml(meta.author)}</span>` : ""}
        <span>${escapeHtml(meta.year || "")}${meta.year ? " · " : ""}${fa(chapters.length)} فصل</span>
      </p>
      ${
        first
          ? `<a class="doc-title__start" href="#/chapter/${encodeURIComponent(first.id)}">
               شروع خواندن ${icon("arrow-start")}
             </a>`
          : ""
      }
    </div>`;
}

/* ---------- فهرست کناری ---------- */

export function tocView(book, route) {
  const currentChapter = route.type === "chapter" ? route.id : null;
  const currentSection = route.type === "chapter" ? route.section : null;

  const parts = book.parts
    .map((part) => {
      const items = book.chapters
        .map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) => chapter.part === part.id);

      if (!items.length) return "";

      const rows = items
        .map(({ chapter, index }) => {
          const isCurrent = chapter.id === currentChapter && !currentSection;
          const sections = chapter.sections || [];

          const subRows = sections
            .map((section) => {
              const active = chapter.id === currentChapter && section.slug === currentSection;
              return `
                <li>
                  <a class="sb__link sb__link--sub${section.level === 3 ? " sb__link--deep" : ""}${active ? " is-active" : ""}"
                     href="#/chapter/${encodeURIComponent(chapter.id)}/${encodeURIComponent(section.slug)}">
                    <span class="sb__label">${escapeHtml(section.text)}</span>
                  </a>
                </li>`;
            })
            .join("");

          return `
            <li>
              <a class="sb__link${isCurrent ? " is-active" : ""}"
                 href="#/chapter/${encodeURIComponent(chapter.id)}">
                <span class="sb__num">${escapeHtml(chapter.label || fa(index + 1))}</span>
                <span class="sb__label">${escapeHtml(chapter.title)}</span>
              </a>
              ${subRows ? `<ul class="sb__sub">${subRows}</ul>` : ""}
            </li>`;
        })
        .join("");

      return `
        <div class="sb__group">
          <p class="sb__group-title">${escapeHtml(part.title)}</p>
          <ul class="sb__list">${rows}</ul>
        </div>`;
    })
    .join("");

  const aboutCurrent = route.type === "about";

  return `
    <nav class="sb" aria-label="فهرست کتاب">
      ${parts}
      <div class="sb__group">
        <ul class="sb__list">
          <li>
            <a class="sb__link${aboutCurrent ? " is-active" : ""}" href="#/about">
              <span class="sb__label">دربارهٔ این کتاب</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>`;
}

/* ---------- فصل ---------- */

/**
 * به هر h2/h3 یک id می‌دهد تا لینک‌های فهرست بتوانند به آن بپرند.
 * روی DOM ساخته‌شده کار می‌کند تا متن عنوان دقیقاً همان چیزی باشد
 * که sectionsOf دید (تگ‌های strong حذف‌شده، فاصله‌های نرمال‌شده).
 */
export function anchorsIn(root) {
  if (!root) return;
  root.querySelectorAll("h2, h3").forEach((heading, index) => {
    if (heading.id) return;
    const text = (heading.textContent || "").replace(/\s+/g, " ").trim();
    heading.id = slugify(text) || `section-${index + 1}`;
  });
}

export function chapterView(book, chapter) {
  const part = book.parts.find((p) => p.id === chapter.part);

  return `
    <article class="doc">
      <header class="doc__head">
        <p class="doc__eyebrow">
          ${escapeHtml(part ? part.title : "فصل")}
          ${chapter.label ? ` · فصل ${escapeHtml(chapter.label)}` : ""}
        </p>
        <h1 class="doc__title">${escapeHtml(chapter.title)}</h1>
      </header>
      <div class="doc__body">${chapter.body}</div>
    </article>`;
}

/* ---------- درباره ---------- */

export function aboutView(book) {
  const { meta, chapters, parts, about } = book;
  const words = chapters.reduce(
    (sum, chapter) => sum + wordCount(chapter.body),
    0,
  );
  const minutes = chapters.reduce(
    (sum, chapter) => sum + readingMinutes(chapter.body),
    0,
  );

  return `
    <article class="doc">
      <header class="doc__head">
        <p class="doc__eyebrow">دربارهٔ کتاب</p>
        <h1 class="doc__title">${escapeHtml(meta.title || "")}</h1>
      </header>
      <div class="doc__body">${about}</div>
      <dl class="doc__stats">
        <div class="doc__stat"><dt>فصل</dt><dd>${fa(chapters.length)}</dd></div>
        <div class="doc__stat"><dt>بخش</dt><dd>${fa(parts.length)}</dd></div>
        <div class="doc__stat"><dt>دقیقه خواندن</dt><dd>${fa(minutes)}</dd></div>
        ${words ? `<div class="doc__stat"><dt>کلمه</dt><dd>${fa(words)}</dd></div>` : ""}
      </dl>
      <p class="doc__meta">
        ${meta.author ? `نویسنده: ${escapeHtml(meta.author)}` : ""}
        ${meta.author && meta.year ? " · " : ""}${escapeHtml(meta.year || "")}
      </p>
    </article>`;
}

/* ---------- چکیدهٔ صفحه (برای عنوان مرورگر و سرصفحه) ---------- */

export function pageTitle(book, route) {
  if (route.type === "chapter") {
    const chapter = book.chapters.find((c) => c.id === route.id);
    return chapter ? chapter.running || chapter.title : "";
  }
  if (route.type === "about") return "دربارهٔ کتاب";
  return book.meta.title || "";
}

export function runningHead(book, route) {
  if (route.type === "chapter") {
    const chapter = book.chapters.find((c) => c.id === route.id);
    const part = chapter ? book.parts.find((p) => p.id === chapter.part) : null;
    return part ? part.title : "";
  }
  if (route.type === "about") return book.meta.siteName || "";
  return "";
}

/** شمارهٔ صفحه، با رقم فارسی (از ۲ شروع می‌شود چون جلد صفحهٔ ۱ است). */
export const pageNumber = (book, route) => fa(routeIndex(book, route) + 2);
