/* ==========================================================================
   app.js — نقطهٔ شروع برنامه
   محتوا را بارگذاری می‌کند، به مسیرها گوش می‌دهد و صفحه‌ها را می‌سازد.
   ========================================================================== */

import {
  BookError,
  chapterById,
  loadBook,
  pageCountLabel,
  routeIndex,
  stepRoute,
} from "./content.js";

import { isKnown, navigate, onRouteChange, parseHash } from "./router.js";

import {
  aboutView,
  anchorsIn,
  chapterView,
  coverView,
  pageNumber,
  pageTitle,
  runningHead,
  stepLabel,
  tocView,
} from "./views.js";

import { buildIndex } from "./search.js";

import {
  bindGlobalKeys,
  bindSwipe,
  closeDialogs,
  cycleSkin,
  initTheme,
  paletteLabel,
  setupSearch,
  showFatal,
  toast,
  toggleZen,
} from "./ui.js";

const $ = (selector) => document.querySelector(selector);

/* ---------- وضعیت ---------- */

let book = null;
let searchIndex = [];
let route = { type: "cover" };

/* ---------- رندر ---------- */

function renderSidebar() {
  const container = $("#sidebarContent");
  if (container) container.innerHTML = tocView(book, route);

  const brand = $("#sidebarTitle");
  if (brand) brand.textContent = book.meta.title || "";

  // فصل جاری را در دید نگه دار، ولی هرگز بالای فهرست را نبُر.
  const panel = $("#sidebarScroll");
  const active = panel?.querySelector(".sb__link.is-active");
  if (!panel || !active) return;

  const panelRect = panel.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  const above = activeRect.top < panelRect.top + 8;
  const below = activeRect.bottom > panelRect.bottom - 8;
  if (!above && !below) return;

  panel.scrollTo({
    top:
      panel.scrollTop +
      (activeRect.top - panelRect.top) -
      panel.clientHeight / 3,
    behavior: "smooth",
  });
}

/* ---------- همگام‌سازی فهرست با اسکرول ---------- */

let activeSection = null;

/**
 * با اسکرول سند، بخشی که در بالای دید است را در فهرست برجسته می‌کند.
 * این کار مسیر را عوض نمی‌کند و روی history اثری ندارد.
 */
function syncSidebarToScroll() {
  if (route.type !== "chapter") return;

  const scroller = $("#docScroll");
  if (!scroller) return;

  const heads = [...scroller.querySelectorAll(".doc__body h2[id], .doc__body h3[id]")];
  if (!heads.length) return;

  // خط مرجع: کمی پایین‌تر از لبهٔ بالای دید، تا عنوانی که تازه رسیده برنده شود.
  const line = scroller.getBoundingClientRect().top + 88;

  // آخرین عنوانی که از خط مرجع گذشته، بخش جاری است.
  let current = null;
  for (const heading of heads) {
    if (heading.getBoundingClientRect().top <= line) current = heading;
  }

  // در انتهای فصل، محتوای بعد از آخرین عنوان آن‌قدر کوتاه است که هرگز از خط
  // مرجع نمی‌گذرد؛ پس فهرست تا ابد روی عنوان قبلی گیر می‌کند. وقتی آخرین عنوان
  // در دید است و بعد از آن عنوان دیگری نیست، همان را برنده اعلام می‌کنیم.
  //
  // شرط عمداً بر پایهٔ موقعیت خودِ عنوان است، نه scrollTop: بعد از رندر مجدد
  // مرورگر ممکن است scrollTop قدیمی را لحظه‌ای برگرداند و محاسبهٔ «سقف» را
  // خراب کند.
  const last = heads[heads.length - 1];
  const viewportBottom = scroller.getBoundingClientRect().bottom;
  if (last.getBoundingClientRect().top <= viewportBottom - 48) {
    current = last;
  }

  const slug = current ? current.id : null;
  if (slug === activeSection) return;
  activeSection = slug;

  const panel = $("#sidebarContent");
  if (!panel) return;

  panel.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));

  if (!slug) {
    // بالای فصل: خود فصل را برجسته کن.
    panel.querySelector(`a.sb__link[href="#/chapter/${encodeURIComponent(route.id)}"]`)
      ?.classList.add("is-active");
  } else {
    const link = panel.querySelector(
      `a.sb__link--sub[href="#/chapter/${encodeURIComponent(route.id)}/${encodeURIComponent(slug)}"]`,
    );
    if (link) {
      link.classList.add("is-active");
      revealInSidebar(link);
    }
  }
}

/** آیتم فعال را در فهرست کناری به دید می‌آورد، بدون بریدن بالای فهرست. */
function revealInSidebar(link) {
  const panel = $("#sidebarScroll");
  if (!panel) return;

  const panelRect = panel.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();

  const visible =
    linkRect.top >= panelRect.top + 12 && linkRect.bottom <= panelRect.bottom - 12;
  if (visible) return;

  panel.scrollTo({
    top: panel.scrollTop + (linkRect.top - panelRect.top) - panel.clientHeight / 3,
    behavior: "smooth",
  });
}

function renderPage() {
  const content = $("#content");
  if (!content) return;

  const isCover = route.type === "cover";
  content.classList.toggle("is-title-page", isCover);

  if (isCover) {
    content.innerHTML = coverView(book);
  } else if (route.type === "about") {
    content.innerHTML = aboutView(book);
  } else {
    const chapter = chapterById(book, route.id);
    content.innerHTML = chapter ? chapterView(book, chapter) : "";
  }

  // شناسه‌گذاری عنوان‌ها تا لینک‌های فهرست به بخش درست برسند.
  anchorsIn(content);

  // برگهٔ عنوان باید همیشه از بالا دیده شود — وگرنه جلد نیمه‌کاره می‌ماند.
  if (isCover) {
    content.closest(".doc-sheet")?.scrollIntoView({ block: "start" });
  }

  const scroller = $("#docScroll");
  if (scroller) scroller.scrollTop = 0;

  if (!reduceMotion()) {
    content.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 200, easing: "ease-out" },
    );
  }
}

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function renderChrome() {
  const position = routeIndex(book, route);
  const total = pageCountLabel(book);

  const setText = (selector, value) => {
    const el = $(selector);
    if (el) el.textContent = value;
  };

  setText("#topbarTitle", route.type === "cover" ? "" : pageTitle(book, route));
  setText("#pageNum", pageNumber(book, route));

  const previous = stepRoute(book, route, -1);
  const next = stepRoute(book, route, 1);

  const prevButton = $("#btnPrev");
  const nextButton = $("#btnNext");

  if (prevButton) {
    prevButton.hidden = !previous;
    setText("#prevLabel", stepLabel(book, previous));
    // دکمه متن را از صفحه‌خوان دریافت کند، نه از تکه‌های پراکنده.
    prevButton.setAttribute(
      "aria-label",
      previous ? `قبلی: ${pageTitle(book, previous)}` : "قبلی",
    );
  }

  if (nextButton) {
    nextButton.hidden = !next;
    setText("#nextLabel", stepLabel(book, next));
    nextButton.setAttribute(
      "aria-label",
      next ? `بعدی: ${pageTitle(book, next)}` : "بعدی",
    );
  }

  const progress = $("#progressBar");
  if (progress) {
    const percent = total > 1 ? (position / (total - 1)) * 100 : 0;
    progress.style.width = `${percent}%`;
    progress
      .closest(".progress")
      ?.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  // اگر عنوان صفحه با عنوان کتاب یکی باشد، تکرارش نکن.
  const pageName = pageTitle(book, route);
  const siteName = book.meta.title || "کتاب";
  document.title =
    position === 0 || !pageName || pageName === siteName
      ? siteName
      : `${pageName} — ${siteName}`;
}

function render() {
  activeSection = null;
  renderSidebar();
  renderPage();
  renderChrome();
  // بعد از چیده‌شدن صفحه، پرش به بخش انجام می‌شود.
  requestAnimationFrame(frameThen(() => scrollToSection()));
}

/** اجرای تابع در فریم بعدی (تا چیدمان نهایی شود). */
const frameThen = (fn) => () => requestAnimationFrame(fn);

function scrollToSection() {
  if (route.type !== "chapter" || !route.section) return;

  const target = document.getElementById(route.section);
  const scroller = $("#docScroll");
  if (!target || !scroller) return;

  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    72; // فضای نوار بالا

  scroller.scrollTo({
    top,
    behavior: reduceMotion() ? "auto" : "smooth",
  });

  // اسکرول برنامه‌ای همیشه رویداد scroll را شلیک نمی‌کند (و وقتی مقصد همان
  // جای فعلی باشد، اصلاً شلیک نمی‌کند). پس همگام‌سازی را صریح صدا می‌زنیم.
  settleSidebarSync();
}

/**
 * بعد از یک پرش برنامه‌ای، فهرست را دوباره همگام می‌کند.
 * «scrollend» در همهٔ مرورگرها نیست، پس یک پشتوانهٔ زمانی هم می‌گذاریم.
 */
function settleSidebarSync() {
  const scroller = $("#docScroll");
  if (!scroller) return;

  const run = () => syncSidebarToScroll();

  if ("onscrollend" in scroller) {
    scroller.addEventListener("scrollend", run, { once: true });
  }
  // اسکرول نرم ممکن است چند صد میلی‌ثانیه طول بکشد.
  setTimeout(run, reduceMotion() ? 60 : 520);
}

/* ---------- ناوبری ---------- */

function step(direction) {
  const target = stepRoute(book, route, direction);
  if (!target) return;
  navigate(target);
}

/* ---------- راه‌اندازی ---------- */

/* ---------- منوی کناری ---------- */

const DESKTOP = "(min-width: 980px)";
const isDesktop = () => window.matchMedia(DESKTOP).matches;

function setSidebar(open) {
  const shell = $("#shell");
  const button = $("#btnMenu");
  const scrim = $("#scrim");

  shell?.classList.toggle("is-sidebar-open", open);
  button?.setAttribute("aria-expanded", String(open));
  if (scrim) scrim.hidden = !open || isDesktop();
  document.body.classList.toggle("no-scroll", open && !isDesktop());
}

function toggleSidebar() {
  const shell = $("#shell");
  setSidebar(!shell?.classList.contains("is-sidebar-open"));
}

function bindChrome(search) {
  $("#btnPrev")?.addEventListener("click", () => step(-1));
  $("#btnNext")?.addEventListener("click", () => step(1));
  $("#btnSearch")?.addEventListener("click", search.open);

  $("#btnMenu")?.addEventListener("click", toggleSidebar);
  $("#btnSidebarClose")?.addEventListener("click", () => setSidebar(false));
  $("#scrim")?.addEventListener("click", () => setSidebar(false));

  // در دسکتاپ فهرست باز است؛ در موبایل بسته.
  setSidebar(isDesktop());
  window
    .matchMedia(DESKTOP)
    .addEventListener("change", (event) => setSidebar(event.matches));

  // یک دکمه برای پوسته: روشن/تاریک + پالت
  $("#btnTheme")?.addEventListener("click", handleSkin);

  $("#btnZen")?.addEventListener("click", handleZen);
  $("#btnZenExit")?.addEventListener("click", handleZen);

  // در موبایل، انتخاب هر صفحه از فهرست باید کشو را ببندد؛ وگرنه کاربر با
  // بدنهٔ قفل‌شده (no-scroll) روی صفحهٔ جدید می‌ماند.
  $("#sidebarContent")?.addEventListener("click", (event) => {
    if (event.target.closest("a.sb__link") && !isDesktop()) setSidebar(false);
  });

  // باز/بسته کردن زیربخش‌های هر فصل (بدون تغییر مسیر)
  $("#sidebarContent")?.addEventListener("click", (event) => {
    const toggle = event.target.closest(".sb__toggle");
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();

    const item = toggle.closest(".sb__item");
    const open = item?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(Boolean(open)));
  });

  // بستن مودال با کلیک بیرون یا دکمهٔ بستن
  document.querySelectorAll(".modal").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-close]")) {
        closeDialogs();
      }
    });
  });
}

/** پوسته را جلو می‌برد و نتیجه را در یک توست نشان می‌دهد. */
function handleSkin() {
  const { theme, palette } = cycleSkin();
  toast(`${paletteLabel(palette.id)} · ${theme === "dark" ? "تاریک" : "روشن"}`);
}

function handleZen() {
  const active = toggleZen();
  const button = $("#btnZen");
  if (button) button.setAttribute("aria-pressed", String(active));

  const exit = $("#btnZenExit");
  if (exit) exit.hidden = !active;

  if (!isDesktop()) setSidebar(false);
}

async function init() {
  initTheme();

  try {
    book = await loadBook();
  } catch (error) {
    const message =
      error instanceof BookError
        ? error.message
        : "خطای پیش‌بینی‌نشده در بارگذاری کتاب.";

    showFatal($("#content"), message);
    showFatal($("#tocContent"), "کتاب بارگذاری نشد.");
    console.error(error);
    return;
  }

  searchIndex = buildIndex(book);

  const search = setupSearch({
    dialog: $("#searchModal"),
    input: $("#searchInput"),
    results: $("#searchResults"),
    index: () => searchIndex,
  });

  bindChrome(search);

  bindGlobalKeys({
    onSearch: search.open,
    onTheme: handleSkin,
    onPalette: handleSkin,
    onZen: handleZen,
    onSidebarClose: () => setSidebar(false),
    isTyping: () =>
      /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || ""),
  });

  const docElement = $("#docScroll");
  if (docElement) {
    bindSwipe(docElement, step);

    let ticking = false;
    docElement.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          syncSidebarToScroll();
          ticking = false;
        });
      },
      { passive: true },
    );
  }

  // مسیر اولیه
  const initial = parseHash();
  route = isKnown(book, initial) ? initial : { type: "cover" };
  if (!isKnown(book, initial)) {
    navigate(route, { replace: true });
  }

  render();

  onRouteChange((next) => {
    const safe = isKnown(book, next) ? next : { type: "cover" };

    // کلیک روی بخشی از همان فصلِ باز: مسیر عوض نمی‌شود، پس دستی اسکرول کن.
    if (
      safe.type === "chapter" &&
      route.type === "chapter" &&
      safe.id === route.id &&
      safe.section !== route.section
    ) {
      route = safe;
      scrollToSection();
      return;
    }

    route = safe;
    render();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
