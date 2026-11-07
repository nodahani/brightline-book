/* ==========================================================================
   content.js — بارگذاری و اعتبارسنجی محتوا
   تنها جایی که با فایل‌های content/ حرف می‌زند.
   ========================================================================== */

/** خطای مربوط به محتوا؛ پیامش مستقیم به خواننده نشان داده می‌شود. */
export class BookError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "BookError";
    this.cause = cause;
  }
}

/* ---------- ابزارهای متنی ---------- */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** عدد لاتین را به رقم فارسی تبدیل می‌کند. */
export const fa = (value) => String(value).replace(/\d/g, (d) => FA_DIGITS[d]);

/** HTML را به متن ساده تبدیل می‌کند (برای جست‌وجو و شمارش کلمه). */
export function stripHtml(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  return (holder.textContent || "").replace(/\s+/g, " ").trim();
}

/** تعداد کلمه‌های یک قطعه HTML. */
export function wordCount(html) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

/** زمان تقریبی خواندن بر حسب دقیقه (۱۸۰ کلمه در دقیقه). */
export function readingMinutes(html) {
  return Math.max(1, Math.round(wordCount(html) / 180));
}

/* ---------- اعتبارسنجی ---------- */

function validate(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new BookError("ساختار book.json خوانا نیست.");
  }

  const chapters = manifest.chapters;
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new BookError("book.json هیچ فصلی ندارد.");
  }

  const partIds = new Set((manifest.parts || []).map((p) => p.id));
  const seen = new Set();

  chapters.forEach((chapter, index) => {
    const where = `فصل شمارهٔ ${index + 1}`;

    if (!chapter.id) throw new BookError(`${where}: مقدار id ندارد.`);
    if (seen.has(chapter.id))
      throw new BookError(`${where}: id تکراری است (${chapter.id}).`);
    seen.add(chapter.id);

    if (!chapter.file) throw new BookError(`${where}: مقدار file ندارد.`);
    if (!chapter.title) throw new BookError(`${where}: عنوان ندارد.`);

    if (chapter.part && !partIds.has(chapter.part)) {
      throw new BookError(
        `${where}: بخش «${chapter.part}» در فهرست parts نیست. یکی از این‌ها را بگذار: ${[...partIds].join("، ")}`,
      );
    }
  });
}

/* ---------- عنوان‌های درون‌فصل ---------- */

/**
 * یک شناسهٔ پایدار از متن عنوان می‌سازد تا بتوان مستقیم به آن بخش پیوند داد.
 * حروف فارسی دست‌نخورده می‌مانند؛ فقط فاصله و نشانه‌ها به خط تیره تبدیل می‌شوند.
 */
export function slugify(text) {
  return String(text)
    .replace(/[\u200c\u200f\u200e]/g, "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * فهرست زیربخش‌های یک فصل را از روی h2 و h3 استخراج می‌کند.
 * تگ strong را از عنوان حذف می‌کند تا متن ساده به فهرست برود.
 */
export function sectionsOf(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  const sections = [];

  holder.querySelectorAll("h2, h3").forEach((heading, index) => {
    const text = (heading.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    const slug = slugify(text) || `section-${index + 1}`;
    sections.push({ level: heading.tagName === "H2" ? 2 : 3, text, slug });
  });

  return sections;
}

/* ---------- بارگذاری ---------- */

async function fetchText(url, label) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    throw new BookError(
      `${label} خوانده نشد. اگر فایل را مستقیم از دیسک باز کرده‌ای، یک سرور محلی اجرا کن: python3 -m http.server`,
      cause,
    );
  }
  if (!response.ok) {
    throw new BookError(
      `${label} خوانده نشد (${response.status}). مسیر فایل را بررسی کن.`,
    );
  }
  return response.text();
}

/**
 * کل کتاب را بارگذاری می‌کند: فهرست از book.json و متن هر فصل از فایل خودش.
 * اگر یکی از فصل‌ها بارگذاری نشود، کل کار با یک پیام روشن متوقف می‌شود؛
 * بهتر از این است که کتابی با فصل‌های ناقص نشان دهیم.
 *
 * @param {{ base?: string }} options
 * @returns {Promise<{meta: object, parts: object[], chapters: object[], about: string}>}
 */
export async function loadBook({ base = "content/" } = {}) {
  const raw = await fetchText(`${base}book.json`, "فایل book.json");

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (cause) {
    throw new BookError(
      "book.json یک JSON معتبر نیست. احتمالاً یک ویرگول یا آکولاد جا افتاده است.",
      cause,
    );
  }

  validate(manifest);

  const withBody = await Promise.all(
    manifest.chapters.map(async (chapter) => {
      const body = await fetchText(`${base}${chapter.file}`, `فصل «${chapter.title}»`);
      return {
        ...chapter,
        running: chapter.running || chapter.title,
        body,
        sections: sectionsOf(body),
      };
    }),
  );

  const about = manifest.about?.file
    ? await fetchText(`${base}${manifest.about.file}`, "متن صفحهٔ درباره")
    : "";

  return {
    meta: manifest.meta || {},
    parts: manifest.parts || [],
    chapters: withBody,
    about,
    cover: manifest.cover || {},
  };
}

/* ---------- پیمایش ---------- */

/** فهرست مرتبِ صفحه‌ها: جلد، فصل‌ها، درباره. */
export function pagesOf(book) {
  return [
    { type: "cover" },
    ...book.chapters.map((chapter) => ({ type: "chapter", id: chapter.id })),
    { type: "about" },
  ];
}

export const chapterById = (book, id) =>
  book.chapters.find((c) => c.id === id) || null;

/** فصل و بخشِ داخل آن، از روی id فصل و slug بخش. */
export function sectionById(book, chapterId, slug) {
  const chapter = chapterById(book, chapterId);
  if (!chapter) return null;
  const section = (chapter.sections || []).find((s) => s.slug === slug);
  return section ? { chapter, section } : null;
}
export const partById = (book, id) =>
  book.parts.find((p) => p.id === id) || null;

/** تعداد کل صفحه‌ها (جلد + فصل‌ها + درباره). */
export const pageCountLabel = (book) => pagesOf(book).length;

/** شمارهٔ صفحهٔ جاری در فهرست صفحه‌ها (از صفر). */
export function routeIndex(book, route) {
  const index = pagesOf(book).findIndex(
    (page) =>
      page.type === route.type &&
      (page.type !== "chapter" || page.id === route.id),
  );
  return index === -1 ? 0 : index;
}

/** صفحهٔ قبلی یا بعدی؛ اگر نباشد null. */
export function stepRoute(book, route, direction) {
  const pages = pagesOf(book);
  return pages[routeIndex(book, route) + direction] || null;
}
