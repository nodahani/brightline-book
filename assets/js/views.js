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

/**
 * سطر نشانِ کتاب — هم می‌گوید کتاب است، هم جلدِ چندمِ کدام مجموعه.
 *   «جلد ۱ از مجموعهٔ «خط روشن»»
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

/** نشان جلد: کتابِ باز در حلقهٔ نازک. */
const coverMark = () => `
  <div class="cover__mark">
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <use href="#i-mark"></use>
    </svg>
  </div>`;

export function coverView(book) {
  const { meta, chapters, parts, cover } = book;
  const first = chapters[0];
  const data = cover || {};
  const reasons = Array.isArray(data.reasons) ? data.reasons.filter(Boolean) : [];

  return `
    <div class="cover">
      <div class="cover__frame" aria-hidden="true"></div>

      <div class="cover__inner">
        ${coverMark()}
        ${coverSeries(meta)}

        <header class="cover__head">
          <h1 class="cover__title">${escapeHtml(meta.title || "")}</h1>
          ${meta.subtitle ? `<p class="cover__subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
        </header>

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
          first
            ? `<a class="cover__start" href="#/chapter/${encodeURIComponent(first.id)}">
                 <span>شروع خواندن</span>
                 ${icon("arrow-start", "cover__start-icon")}
               </a>`
            : ""
        }

        <a class="cover__extras" href="#/start">نمی‌دانی از کجا شروع کنی؟ نقشهٔ مسیر</a>

        ${coverRoadmap(chapters, parts)}

        ${
          meta.author
            ? `<p class="cover__author">${escapeHtml(meta.author)}</p>`
            : ""
        }
      </div>
    </div>`;
}

/* ---------- نقشهٔ مسیر «از اینجا شروع کن» ---------- */

/**
 * نقشه از سه «روز» ساخته می‌شود، نه از ترتیب فصل‌ها.
 * هر کار یک شناسهٔ پایدار دارد تا تیک‌خوردنش در حافظهٔ مرورگر بماند و
 * کاربر بتواند وسط راه ببندد و فردا ادامه بدهد.
 */
const START_PLAN = [
  {
    id: "day-1",
    title: "روز اول",
    focus: "بستنِ راه‌های ورود",
    note: "این سه کار بیشتر سرقت حساب‌ها را می‌بندد.",
    tasks: [
      {
        id: "mail-recovery",
        what: "روش بازیابی ایمیل اصلی‌ات را ست کن",
        why: "بدون این، اگر رمز را گم کنی یا گوشی‌ات گم شود، صندوقت برای همیشه قفل می‌ماند.",
        minutes: 5,
        chapter: "02-imail",
        heading: "۲.۱",
      },
      {
        id: "mail-2fa",
        what: "ورود دومرحله‌ای ایمیل را روشن کن",
        why: "مایکروسافت می‌گوید این کار بیش از ۹۹.۹٪ حملات خودکار به حساب را می‌بندد.",
        minutes: 7,
        chapter: "02-imail",
        heading: "۲.۲",
      },
      {
        id: "vault",
        what: "یک پسورد منیجر بساز و تنها رمز اصلی را حفظ کن",
        why: "تکرار رمز، رایج‌ترین راه ورود مهاجم است؛ گاوصندوق آن را تمام می‌کند.",
        minutes: 10,
        chapter: "02-hesab",
        heading: "۳.۲",
      },
    ],
  },
  {
    id: "day-2",
    title: "روز دوم",
    focus: "حساب‌های مهم",
    note: "حساب‌های مهم را ببند؛ بقیه می‌توانند صبر کنند.",
    tasks: [
      {
        id: "bank-2fa",
        what: "ورود دومرحله‌ای بانک و پیام‌رسان‌ها را روشن کن",
        why: "حساب بانکی و پیام‌رسان، بیشترین ارزش را برای مهاجم دارند.",
        minutes: 8,
        chapter: "02-hesab",
        heading: "۳.۳",
      },
      {
        id: "recovery-sheet",
        what: "کدهای نجات را روی کاغذ بنویس و در دو جای جدا بگذار",
        why: "اگر گوشی گم شود، همین برگه‌ها تنها راه برگشت‌اند.",
        minutes: 7,
        chapter: "02-hesab",
        heading: "۳.۴",
      },
      {
        id: "adblock",
        what: "یک مسدودکنندهٔ تبلیغ و ردیاب نصب کن",
        why: "بخش بزرگی از بدافزارها از تبلیغ‌های آلوده می‌آیند.",
        minutes: 10,
        chapter: "03-morur",
        heading: "۴.۱",
      },
    ],
  },
  {
    id: "day-3",
    title: "روز سوم",
    focus: "داده و دستگاه",
    note: "این‌ها را یک‌بار انجام می‌دهی، بعد فقط سالی یک‌بار مرور می‌کنی.",
    tasks: [
      {
        id: "backup-1",
        what: "نسخهٔ اول بک‌اپ را بگیر — عکس‌ها و مدارک، نه کل درایو",
        why: "دادهٔ ازدست‌رفته را هیچ رمزی برنمی‌گرداند.",
        minutes: 15,
        chapter: "04-dade",
        heading: "۵.۱",
      },
      {
        id: "backup-test",
        what: "همان بک‌اپ را یک بار باز کن و مطمئن شو سالم است",
        why: "بک‌اپِ تست‌نشده، بک‌اپ نیست؛ فقط یک امید است.",
        minutes: 5,
        chapter: "04-dade",
        heading: "۵.۱",
      },
      {
        id: "updates",
        what: "به‌روزرسانی خودکار سیستم و مرورگر را روشن کن",
        why: "بسیاری از نفوذها از سوراخ‌هایی است که چند ماه قبل وصله شده‌اند.",
        minutes: 5,
        chapter: "06-harim",
        heading: "۷.۳",
      },
    ],
  },
];

/** «۵ دقیقه» — یک شکل، برای همهٔ جاها. */
export const minutesLabel = (minutes) => `${fa(minutes)} دقیقه`;

/** جمع زمانِ یک روز. */
export const dayMinutes = (day) =>
  day.tasks.reduce((sum, task) => sum + task.minutes, 0);

/** جمع زمانِ کل نقشه. */
export const planMinutes = () =>
  START_PLAN.reduce((sum, day) => sum + dayMinutes(day), 0);

/** کارهای یک فصل، به ترتیب نقشه. */
export const tasksOfChapter = (chapterId) =>
  planTasks().filter((task) => task.chapter === chapterId);

/** سرفصلی که این کار را آموزش می‌دهد، از روی شمارهٔ سرفصل. */
export const sectionOfTask = (book, task) => {
  const chapter = book.chapters.find((item) => item.id === task.chapter);
  const heading = String(task.heading || "").trim();
  if (!chapter || !heading) return null;
  return (
    (chapter.sections || []).find(
      (section) => section.level === 2 && section.text.startsWith(`${heading} `),
    ) || null
  );
};

/** نشانی آموزش یک کار: مستقیم به همان سرفصل، نه اول فصل. */
export const taskHref = (book, task) => {
  const base = `#/chapter/${encodeURIComponent(task.chapter)}`;
  const section = sectionOfTask(book, task);
  return section ? `${base}/${encodeURIComponent(section.slug)}` : base;
};

const MAP_KEY = "khat-roshan/map-done";

function readDone() {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDone(list) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(list));
  } catch {
    /* اگر حافظه بسته باشد، نقشه باز هم کار می‌کند؛ فقط تیک نمی‌ماند. */
  }
}

/** کل کارهای نقشه، برای شمردن پیشرفت. */
export function planTasks() {
  return START_PLAN.flatMap((day) => day.tasks);
}

/**
 * تیک‌های نقشه را زنده نگه می‌دارد.
 * در حافظهٔ مرورگر ذخیره می‌شود؛ اگر حافظه بسته باشد، تیک‌ها همان‌جا کار
 * می‌کنند و فقط بعد از بستن صفحه از دست می‌روند — هرگز خطا نمی‌دهند.
 */
export function bindPlan(root) {
  if (!root) return;

  const boxes = [...root.querySelectorAll(".map__check input[data-task]")];
  if (!boxes.length) return;

  const refresh = () => {
    const total = boxes.length;
    const done = boxes.filter((box) => box.checked).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const bar = root.querySelector("[data-map-progress] .map__bar > span");
    if (bar) bar.style.width = `${percent}%`;

    const count = root.querySelector("[data-map-progress] .map__count");
    if (count) count.textContent = `${fa(done)} از ${fa(total)} کار انجام شده`;
  };

  boxes.forEach((box) => {
    box.addEventListener("change", () => {
      const done = readDone();
      const id = box.dataset.task;
      const next = box.checked
        ? [...new Set([...done, id])]
        : done.filter((item) => item !== id);

      writeDone(next);
      refresh();
    });
  });

  refresh();
}

export function startView(book) {
  const done = readDone();
  const total = planTasks().length;
  const finished = planTasks().filter((task) => done.includes(task.id)).length;
  const percent = total ? Math.round((finished / total) * 100) : 0;

  const days = START_PLAN.map(
    (day) => `
      <li class="map__day">
        ${escapeHtml(day.title)} — ${minutesLabel(dayMinutes(day))}
        ${day.focus ? ` · ${escapeHtml(day.focus)}` : ""}
        ${day.note ? `<span class="map__day-note">${escapeHtml(day.note)}</span>` : ""}
      </li>
      <ul class="map__list">
        ${day.tasks
          .map(
            (task) => `
          <li>
            <label class="map__check">
              <input type="checkbox" data-task="${escapeHtml(task.id)}" ${
                done.includes(task.id) ? "checked" : ""
              } />
              <span class="map__body">
                <span class="map__what">${escapeHtml(task.what)}<span class="map__time">${minutesLabel(
                  task.minutes,
                )}</span></span>
                <span class="map__why">${escapeHtml(task.why)}</span>
              </span>
            </label>
            <a class="map__go" href="${taskHref(book, task)}">رفتن به آموزش</a>
          </li>`,
          )
          .join("")}
      </ul>`,
  ).join("");

  return `
    <article class="doc">
      <header class="doc__head">
        <p class="doc__eyebrow">نقشهٔ مسیر</p>
        <h1 class="doc__title">از اینجا شروع کن</h1>
      </header>
      <div class="doc__body">
        <p class="map__intro">
          اگر نمی‌دانی از کجا شروع کنی، همین‌جاست. سه روز، سه دستهٔ کار، روی هم
          <strong>حدود یک ساعت</strong>. لازم نیست همه را امشب انجام بدهی — هر
          تیک که می‌زنی همین‌جا ذخیره می‌شود، پس فردا از همان‌جا ادامه می‌دهی.
          البته که اگر کل کتاب را بخوانی چیز هایه مهمی یاد میگیری (پیشنهادی)
        </p>

        <p class="map__progress" data-map-progress>
          <span class="map__bar" aria-hidden="true"><span style="width:${percent}%"></span></span>
          <span class="map__count">${fa(finished)} از ${fa(total)} کار انجام شده</span>
        </p>

        <ol class="map">${days}</ol>

        <p class="map__foot">
          کارهای روز اول و دوم را اگر همین هفته انجام دهی، بزرگ‌ترین بخش کار تمام
          است. روز سوم را می‌توانی به آخر هفته موکول کنی.
        </p>
      </div>
    </article>`;
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

          // فقط سرفصل‌های اصلی (h2). زیرنویس‌های ریز فهرست را شلوغ می‌کنند
          // و کاربر را از «نقشهٔ کار» دور می‌کنند.
          const subRows = sections
            .filter((section) => section.level === 2)
            .map((section) => {
              const active = chapter.id === currentChapter && section.slug === currentSection;
              return `
                <li>
                  <a class="sb__link sb__link--sub${active ? " is-active" : ""}"
                     href="#/chapter/${encodeURIComponent(chapter.id)}/${encodeURIComponent(section.slug)}">
                    <span class="sb__label">${escapeHtml(section.text)}</span>
                  </a>
                </li>`;
            })
            .join("");

          // زیربخش‌ها پیش‌فرض بسته‌اند؛ فقط فصل جاری باز است.
          const open = chapter.id === currentChapter;
          const hasSub = sections.some((section) => section.level === 2);

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
  const startCurrent = route.type === "start";

  return `
    <nav class="sb" aria-label="فهرست کتاب">
      <div class="sb__group">
        <ul class="sb__list">
          <li>
            <a class="sb__link sb__link--start${startCurrent ? " is-active" : ""}" href="#/start">
              <span class="sb__label">از اینجا شروع کن</span>
            </a>
          </li>
        </ul>
      </div>
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
      <div class="doc__body">${chapter.body}${chapterNext(book, chapter)}</div>
    </article>`;
}

/**
 * فهرستِ سادهٔ نقشه، برای فصل ۸.
 *
 * همین فهرست پیش از این دستی در ۰۷-jam نوشته شده بود و از نقشهٔ واقعی جدا
 * افتاده بود — ده کار و ۸۰ دقیقه، در حالی که نقشه نُه کار و ۶۵ دقیقه بود، و
 * دو کارش به بخشِ اشتباهِ کتاب اشاره می‌کرد. حالا از همان START_PLAN ساخته
 * می‌شود و شمارهٔ بخش را هم از همان کار می‌خواند.
 *
 * فهرست بدون تیک است؛ تیک‌زدن کارِ صفحهٔ «از اینجا شروع کن» است و اینجا فقط
 * مرور است. هر ردیف به همان بخشی می‌پرد که آموزشش می‌دهد.
 */
export function hydratePlanList(book, root) {
  if (!root) return;

  const holder = root.querySelector("[data-plan-list]");
  if (holder) {
    holder.innerHTML = START_PLAN.map(
      (day) => `
      <p class="map__day">
        ${escapeHtml(day.title)} — ${minutesLabel(dayMinutes(day))}${
          day.focus ? ` · ${escapeHtml(day.focus)}` : ""
        }
      </p>
      <ol class="map__list map__list--plain">
        ${day.tasks
          .map(
            (task) => `
          <li>
            <a class="map__what" href="${taskHref(book, task)}">${escapeHtml(task.what)}</a>
            <span class="map__time">${minutesLabel(task.minutes)}</span>
            <span class="map__why">${escapeHtml(task.why)}</span>
          </li>`,
          )
          .join("")}
      </ol>`,
    ).join("");
  }

  const total = root.querySelector("[data-plan-time]");
  if (total) total.textContent = `${minutesLabel(planMinutes())}، در سه روز`;

  // جملهٔ «روی هم …» عددش از همین جدول می‌آید؛ خودِ جمله در HTML می‌ماند و
  // فقط همان <strong> عوض می‌شود.
  if (root.querySelector("[data-map-progress]")) {
    const sum = root.querySelector(".map__intro strong");
    if (sum) sum.textContent = minutesLabel(planMinutes());
  }
}

/**
 * نوار پایانی هر فصل: کارهای نقشه‌ای که در همین فصل آموزش داده می‌شوند.
 *
 * پیش از این یک جدول دستی می‌گفت هر فصل کدام کار را نشان بدهد، و آن جدول با
 * ترتیب کتاب نمی‌خواند: کارتِ «حفاظت از داده‌ها» به مسدودکنندهٔ تبلیغ (فصل ۴)
 * اشاره می‌کرد، کارتِ «تهدیدات» به دومرحله‌ایِ بانک (فصل ۳) و کارتِ «حریم
 * خصوصی» به تستِ بک‌اپ (فصل ۵) — یعنی خواننده را به عقب می‌فرستاد. حالا فقط
 * فصل‌هایی کارت می‌گیرند که کارشان را خودشان آموزش می‌دهند.
 */
function chapterNext(book, chapter) {
  const tasks = tasksOfChapter(chapter.id);
  if (!tasks.length) return "";

  const done = readDone();
  const allDone = tasks.every((task) => done.includes(task.id));

  const rows = tasks
    .map((task) => {
      const isDone = done.includes(task.id);
      return `
        <li class="nextstep__item${isDone ? " is-done" : ""}">
          <button type="button" class="nextstep__done" data-task="${escapeHtml(
            task.id,
          )}" aria-pressed="${isDone}">
            ${isDone ? "✓ انجام شده" : "انجامش دادم"}
          </button>
          <span class="nextstep__body">
            <span class="nextstep__what">${escapeHtml(task.what)}<span class="map__time">${minutesLabel(
              task.minutes,
            )}</span></span>
            <span class="nextstep__why">${escapeHtml(task.why)}</span>
          </span>
        </li>`;
    })
    .join("");

  return `
    <aside class="nextstep${allDone ? " is-done" : ""}" data-nextstep="${escapeHtml(
      chapter.id,
    )}">
      <p class="nextstep__label">${
        allDone ? "کارهای این فصل انجام شد" : "کارهای این فصل در نقشه"
      }</p>
      <ul class="nextstep__list">${rows}</ul>
      <p class="nextstep__actions">
        <a class="nextstep__map" href="#/start">دیدن کل نقشه</a>
      </p>
    </aside>`;
}

/**
 * هر دکمهٔ «انجامش دادم» را زنده می‌کند — در کارت فصل و در نقشه، هر دو.
 * همان ذخیره‌سازی، بدون کد دوم.
 */
export function bindNextStep(root) {
  const buttons = [...root.querySelectorAll(".nextstep__done")];
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.task;
      if (!id) return;

      const current = readDone();
      const nowDone = !current.includes(id);
      const next = nowDone
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id);

      writeDone(next);

      button.setAttribute("aria-pressed", String(nowDone));
      button.textContent = nowDone ? "✓ انجام شده" : "انجامش دادم";
      button.closest(".nextstep__item")?.classList.toggle("is-done", nowDone);

      const card = button.closest(".nextstep");
      if (!card) return;
      const allDone = [...card.querySelectorAll(".nextstep__done")].every(
        (item) => item.getAttribute("aria-pressed") === "true",
      );
      card.classList.toggle("is-done", allDone);
      const label = card.querySelector(".nextstep__label");
      if (label) {
        label.textContent = allDone
          ? "کارهای این فصل انجام شد"
          : "کارهای این فصل در نقشه";
      }
    });
  });
}

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
  if (route.type === "start") return "از اینجا شروع کن";
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
  if (route.type === "start") return "شروع کن";
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
  if (route.type === "start") return "نقشهٔ مسیر";
  if (route.type === "about") return book.meta.siteName || "";
  return "";
}

/** شمارهٔ صفحه، با رقم فارسی (از ۲ شروع می‌شود چون جلد صفحهٔ ۱ است). */
export const pageNumber = (book, route) => fa(routeIndex(book, route) + 2);
