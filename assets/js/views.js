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

/** نقشهٔ راه جلد: هر بخش با بازهٔ شمارهٔ فصل‌هایش. */
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
          <span class="cover__step-name">${escapeHtml(row.title)}</span>
          <span class="cover__step-num">${
            row.from === row.to ? fa(row.from) : `${fa(row.from)}–${fa(row.to)}`
          }</span>
        </li>`,
        )
        .join("")}
    </ol>`;
}

/** واژه‌های شناسنامه: ۸ فصل · حدود ۵۰ دقیقه خواندن */
function coverStats(chapters) {
  const minutes = chapters.reduce(
    (sum, chapter) => sum + readingMinutes(chapter.body || ""),
    0,
  );
  return [
    `${fa(chapters.length)} فصل`,
    minutes ? `حدود ${fa(minutes)} دقیقه` : "",
  ].filter(Boolean);
}

/**
 * سطر نشانِ کتاب — هم می‌گوید کتاب است، هم جلدِ چندمِ کدام مجموعه.
 *   «جلد ۱ از مجموعهٔ «خط روشن»»
 * اگر سری تعریف نشده باشد فقط «جلد ۱» می‌آید.
 */
function coverSeries(meta) {
  const series = meta.series || "";
  const volume = meta.volume ? `جلد ${fa(meta.volume)}` : "";

  let head = "";
  if (volume && series) head = `${volume} از مجموعهٔ «${series}»`;
  else if (volume) head = volume;
  else if (series && series !== meta.title) head = `«${series}»`;

  const tail = meta.volumeTitle || "";
  const line = [head, tail].filter(Boolean).join(" — ");

  return line ? `<p class="cover__series">${escapeHtml(line)}</p>` : "";
}

export function coverView(book) {
  const { meta, chapters, parts, cover } = book;
  const first = chapters[0];
  const data = cover || {};
  const reasons = Array.isArray(data.reasons) ? data.reasons.filter(Boolean) : [];

  return `
    <div class="cover">
      ${coverSeries(meta)}

      <header class="cover__head">
        <h1 class="cover__title">${escapeHtml(meta.title || "")}</h1>
        ${meta.subtitle ? `<p class="cover__subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
      </header>

      <div class="cover__rule" aria-hidden="true"></div>

      ${
        data.kicker
          ? `<p class="cover__kicker">${escapeHtml(data.kicker)}</p>`
          : ""
      }

      ${
        reasons.length
          ? `<ul class="cover__reasons">
        ${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>`
          : ""
      }

      ${
        data.note ? `<p class="cover__note">${escapeHtml(data.note)}</p>` : ""
      }

      <footer class="cover__foot">
        ${
          first
            ? `<a class="cover__start" href="#/chapter/${encodeURIComponent(first.id)}">
                 <span>شروع خواندن</span>
                 ${icon("arrow-start", "cover__start-icon")}
               </a>`
            : ""
        }

        ${coverRoadmap(chapters, parts)}

        <p class="cover__byline">
          ${
            meta.author
              ? `<span class="cover__author"><span class="cover__author-label">نویسنده</span>${escapeHtml(meta.author)}</span>`
              : ""
          }
          ${
            data.justification
              ? `<span class="cover__why">${escapeHtml(data.justification)}</span>`
              : ""
          }
          ${
            data.justificationNote
              ? `<span class="cover__why-note">${escapeHtml(data.justificationNote)}</span>`
              : ""
          }
        </p>

        <p class="cover__meta">
          ${[...coverStats(chapters), meta.year || ""]
            .filter(Boolean)
            .map((item) => `<span>${escapeHtml(String(item))}</span>`)
            .join("")}
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
