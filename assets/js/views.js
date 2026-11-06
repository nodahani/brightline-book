/* ==========================================================================
   views.js — ساختِ HTML هر بخش
   این ماژول چیزی را به صفحه «نمی‌چسباند»؛ فقط رشتهٔ HTML برمی‌گرداند.
   همین کار تست و جایگزینی‌اش را ساده می‌کند.
   ========================================================================== */

import { fa, readingMinutes, routeIndex, wordCount } from "./content.js";

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

/* ---------- جلد ---------- */

export function coverView(book) {
  const { meta, chapters } = book;
  const first = chapters[0];

  return `
    <div class="cover">
      <div class="cover__frame" aria-hidden="true"></div>
      <p class="cover__eyebrow">${escapeHtml(meta.siteName || "")}</p>
      <h1 class="cover__title">${escapeHtml(meta.title || "")}</h1>
      ${meta.subtitle ? `<p class="cover__subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
      <div class="cover__ornament" aria-hidden="true">${icon("quill")}</div>
      <p class="cover__meta">
        ${meta.author ? `<span class="cover__author">${escapeHtml(meta.author)}</span>` : ""}
        <span>${escapeHtml(meta.year || "")}${meta.year ? " · " : ""}${fa(chapters.length)} فصل</span>
      </p>
      ${
        first
          ? `<a class="cover__start" href="#/chapter/${encodeURIComponent(first.id)}">
               شروع خواندن ${icon("arrow-start")}
             </a>`
          : ""
      }
    </div>`;
}

/* ---------- فهرست ---------- */

export function tocView(book, route) {
  const currentChapter = route.type === "chapter" ? route.id : null;

  const parts = book.parts
    .map((part) => {
      const items = book.chapters
        .map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) => chapter.part === part.id);

      if (!items.length) return "";

      const links = items
        .map(({ chapter, index }) => {
          const isCurrent = chapter.id === currentChapter;
          return `
            <li>
              <a class="toc__link${isCurrent ? " is-current" : ""}"
                 href="#/chapter/${encodeURIComponent(chapter.id)}"
                 ${isCurrent ? 'aria-current="page"' : ""}>
                <span class="toc__num">${escapeHtml(chapter.label || fa(index + 1))}</span>
                <span class="toc__name">${escapeHtml(chapter.title)}</span>
                <span class="toc__dots" aria-hidden="true"></span>
                <span class="toc__page">${fa(index + 3)}</span>
              </a>
            </li>`;
        })
        .join("");

      return `
        <div class="toc__part">
          <h3 class="toc__part-title">${escapeHtml(part.title)}</h3>
          <ul class="toc__list">${links}</ul>
        </div>`;
    })
    .join("");

  const aboutCurrent = route.type === "about";

  return `
    <nav class="toc" aria-label="فهرست کتاب">
      <h2 class="toc__title">فهرست</h2>
      <p class="toc__subtitle">${fa(book.chapters.length)} فصل در ${fa(book.parts.length)} بخش</p>
      ${parts}
      <div class="toc__part">
        <h3 class="toc__part-title">پیوست</h3>
        <ul class="toc__list">
          <li>
            <a class="toc__link${aboutCurrent ? " is-current" : ""}" href="#/about"
               ${aboutCurrent ? 'aria-current="page"' : ""}>
              <span class="toc__num">—</span>
              <span class="toc__name">دربارهٔ این کتاب</span>
              <span class="toc__dots" aria-hidden="true"></span>
              <span class="toc__page">${fa(book.chapters.length + 3)}</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>`;
}

/* ---------- فصل ---------- */

export function chapterView(book, chapter) {
  const part = book.parts.find((p) => p.id === chapter.part);

  return `
    <header class="chapter-head">
      <p class="chapter-head__badge">
        ${escapeHtml(part ? part.title : "فصل")}
        ${chapter.label ? ` · ${escapeHtml(chapter.label)}` : ""}
      </p>
      <h1 class="chapter-head__title">${escapeHtml(chapter.title)}</h1>
    </header>
    <div class="chapter-body">${chapter.body}</div>`;
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
    <header class="chapter-head">
      <p class="chapter-head__badge">${icon("info", "badge-icon")} دربارهٔ کتاب</p>
      <h1 class="chapter-head__title">${escapeHtml(meta.title || "")}</h1>
    </header>
    <div class="chapter-body">${about}</div>
    <dl class="about__stats">
      <div class="about__stat"><dt>فصل</dt><dd>${fa(chapters.length)}</dd></div>
      <div class="about__stat"><dt>بخش</dt><dd>${fa(parts.length)}</dd></div>
      <div class="about__stat"><dt>دقیقه خواندن</dt><dd>${fa(minutes)}</dd></div>
    </dl>
    <p class="about__meta">
      ${meta.author ? `نویسنده: ${escapeHtml(meta.author)}` : ""}
      ${meta.author && meta.year ? " · " : ""}${escapeHtml(meta.year || "")}
      ${words ? `<br />${fa(words)} کلمه` : ""}
    </p>`;
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
