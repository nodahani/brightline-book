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

/* ---------- صفحهٔ عنوان (جلد) ---------- */

/** سه چیزی که این کتاب عملاً جلویش را می‌گیرد. */
const COVER_PROMISES = [
  {
    icon: "key",
    title: "حسابت دزدیده نشود",
    text: "ایمیل، رمز و ورود دومرحله‌ای — سه لایه‌ای که بیشتر سرقت‌ها را می‌بندد.",
  },
  {
    icon: "hdd",
    title: "داده‌ات از دست نرود",
    text: "بک‌اپی که یک‌بار واقعاً بازگردانی کرده‌ای، نه یک امید.",
  },
  {
    icon: "shield",
    title: "فریب نخوری",
    text: "فیشینگ، درگاه جعلی و پیام‌های «فوری» را از هم تشخیص بده.",
  },
];

/** نشان جلد: سپر با خط روشن. */
const coverMark = () => `
  <svg class="cover__mark" viewBox="0 0 64 64" aria-hidden="true" fill="none">
    <path d="M32 5 9 14.5v17.4C9 45.6 19 55.7 32 59c13-3.3 23-13.4 23-27.1V14.5L32 5Z"
          stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M21 32.8 28.6 40.4 43.5 22.8"
          stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

/**
 * نقشهٔ راه جلد: هر بخش با بازهٔ شمارهٔ فصل‌هایش.
 * بازه از موقعیت فصل‌ها ساخته می‌شود، نه از رقم فارسی داخل label.
 */
function coverRoadmap(chapters, parts) {
  const rows = parts
    .map((part) => {
      const at = chapters.reduce(
        (acc, chapter, i) => (chapter.part === part.id ? [...acc, i + 1] : acc),
        [],
      );
      return at.length ? { title: part.title, from: at[0], to: at[at.length - 1] } : null;
    })
    .filter(Boolean);

  if (!rows.length) return "";

  return `
    <ol class="cover__roadmap">
      ${rows
        .map(
          (row) => `
        <li class="cover__step">
          <span class="cover__step-dot" aria-hidden="true"></span>
          <span class="cover__step-name">${escapeHtml(row.title)}</span>
          <span class="cover__step-num">${
            row.from === row.to ? fa(row.from) : `${fa(row.from)}–${fa(row.to)}`
          }</span>
        </li>`,
        )
        .join("")}
    </ol>`;
}

export function coverView(book) {
  const { meta, chapters, parts } = book;
  const first = chapters[0];
  const minutes = chapters.reduce(
    (sum, chapter) => sum + readingMinutes(chapter.body || ""),
    0,
  );

  return `
    <div class="cover">
      <header class="cover__head">
        ${coverMark()}
        <h1 class="cover__title">${escapeHtml(meta.title || "")}</h1>
        ${meta.subtitle ? `<p class="cover__kicker">${escapeHtml(meta.subtitle)}</p>` : ""}
      </header>

      <ul class="cover__promises">
        ${COVER_PROMISES.map(
          (item) => `
          <li class="cover__promise">
            <span class="cover__promise-icon">${icon(item.icon)}</span>
            <span class="cover__promise-title">${escapeHtml(item.title)}</span>
            <span class="cover__promise-text">${escapeHtml(item.text)}</span>
          </li>`,
        ).join("")}
      </ul>

      ${coverRoadmap(chapters, parts)}

      <footer class="cover__foot">
        ${
          first
            ? `<a class="cover__start" href="#/chapter/${encodeURIComponent(first.id)}">
                 شروع خواندن ${icon("arrow-start")}
               </a>`
            : ""
        }
        <p class="cover__meta">
          ${meta.author ? `<span>${escapeHtml(meta.author)}</span>` : ""}
          ${meta.year ? `<span>${escapeHtml(meta.year)}</span>` : ""}
          <span>${fa(chapters.length)} فصل · حدود ${fa(minutes)} دقیقه</span>
        </p>
      </footer>
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

          // زیربخش‌ها پیش‌فرض بسته‌اند؛ فقط فصل جاری باز است.
          const open = chapter.id === currentChapter;
          const hasSub = sections.length > 0;

          return `
            <li class="sb__item${open ? " is-open" : ""}">
              <div class="sb__row">
                <a class="sb__link${isCurrent && !currentSection ? " is-active" : ""}"
                   href="#/chapter/${encodeURIComponent(chapter.id)}">
                  <span class="sb__num">${escapeHtml(chapter.label || fa(index + 1))}</span>
                  <span class="sb__label">${escapeHtml(chapter.title)}</span>
                </a>
                ${
                  hasSub
                    ? `<button class="sb__toggle" aria-expanded="${open}" aria-label="باز/بستن زیربخش‌های این فصل">
                         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                       </button>`
                    : ""
                }
              </div>
              ${hasSub ? `<ul class="sb__sub">${subRows}</ul>` : ""}
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

/**
 * عنوان کوتاه برای دکمه‌های قبلی/بعدی.
 * در دکمه جا کم است، پس فقط «قسمت اصلی» عنوان را می‌دهیم:
 * «مقدمه — چرا باید نگران باشیم؟» → «مقدمه».
 */
export function stepLabel(book, route) {
  if (!route) return "";
  if (route.type === "cover") return "جلد";
  if (route.type === "about") return "دربارهٔ کتاب";

  const chapter = book.chapters.find((c) => c.id === route.id);
  if (!chapter) return "";
  if (chapter.running) return chapter.running;

  // اگر running نداشت، پیش از خط تیره یا نقطه را بردار.
  return String(chapter.title || "").split(/[—–:]|\s-\s/)[0].trim();
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
