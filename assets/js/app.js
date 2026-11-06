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
  tocView,
} from "./views.js";

import { buildIndex } from "./search.js";

import {
  bindGlobalKeys,
  bindSwipe,
  closeDialogs,
  cyclePalette,
  initTheme,
  openDialog,
  paletteLabel,
  setupSearch,
  showFatal,
  toast,
  toggleTheme,
  toggleZen,
} from "./ui.js";

const $ = (selector) => document.querySelector(selector);

/* ---------- وضعیت ---------- */

let book = null;
let searchIndex = [];
let route = { type: "cover" };

/* ---------- رندر ---------- */

function renderToc() {
  const container = $("#tocContent");
  if (container) container.innerHTML = tocView(book, route);

  const runningHeadEl = $("#leftRunning");
  const titleEl = $("#leftTitle");
  const currentPart = runningHead(book, route);

  if (runningHeadEl) runningHeadEl.textContent = currentPart || "فهرست";
  if (titleEl) titleEl.textContent = book.meta.title || "";

  // فهرست را روی فصل جاری نگه دار — بدون اسکرول کل صفحه.
  const panel = $("#tocContent");
  const current = panel?.querySelector(".is-current");
  if (panel && current) {
    const offset =
      current.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    panel.scrollTop += offset - panel.clientHeight / 3;
  }
}

function renderPage() {
  const content = $("#content");
  if (!content) return;

  const isCover = route.type === "cover";
  content.classList.toggle("is-cover", isCover);

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

  const scroller = $("#scroller");
  if (scroller) scroller.scrollTop = 0;

  content.animate(
    [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

function renderChrome() {
  const total = pageCountLabel(book);
  const position = routeIndex(book, route);

  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };

  setText("#pageNum", pageNumber(book, route));
  setText("#rightRunning", pageTitle(book, route));
  setText("#rightPart", runningHead(book, route));
  setText("#toolbarTitle", book.meta.title || "");

  const previous = stepRoute(book, route, -1);
  const next = stepRoute(book, route, 1);

  const prevButton = $("#btnPrev");
  const nextButton = $("#btnNext");

  if (prevButton) {
    prevButton.disabled = !previous;
    setText("#prevLabel", previous ? pageTitle(book, previous) : "قبلی");
  }

  if (nextButton) {
    nextButton.disabled = !next;
    setText("#nextLabel", next ? pageTitle(book, next) : "بعدی");
  }

  const progress = $("#progressBar");
  if (progress) {
    const percent = total > 1 ? (position / (total - 1)) * 100 : 0;
    progress.style.width = `${percent}%`;
    progress
      .closest(".progress")
      ?.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  document.title =
    position === 0
      ? book.meta.title || "کتاب"
      : `${pageTitle(book, route)} — ${book.meta.title || "کتاب"}`;
}

function scrollToSection() {
  if (route.type !== "chapter" || !route.section) return;

  const target = document.getElementById(route.section);
  const scroller = $("#scroller");
  if (!target || !scroller) return;

  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    16;

  scroller.scrollTo({ top, behavior: "smooth" });
}

function render() {
  renderToc();
  renderPage();
  renderChrome();
  scrollToSection();
}

/* ---------- ناوبری ---------- */

function step(direction) {
  const target = stepRoute(book, route, direction);
  if (!target) return;
  navigate(target);
}

/* ---------- راه‌اندازی ---------- */

function bindChrome(search) {
  $("#btnPrev")?.addEventListener("click", () => step(-1));
  $("#btnNext")?.addEventListener("click", () => step(1));
  $("#btnSearch")?.addEventListener("click", search.open);

  $("#btnToc")?.addEventListener("click", () => {
    const isMobile = window.matchMedia("(max-width: 979px)").matches;

    if (isMobile) {
      const dialog = $("#tocModal");
      const body = $("#tocModalBody");
      if (body) body.innerHTML = tocView(book, route);
      openDialog(dialog);
      return;
    }

    $("#tocContent")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  $("#btnTheme")?.addEventListener("click", () => {
    toggleTheme();
  });

  $("#btnPalette")?.addEventListener("click", () => {
    const next = cyclePalette();
    toast(`پالت: ${paletteLabel(next.id)}`);
  });

  $("#btnZen")?.addEventListener("click", handleZen);

  // بستن مودال با کلیک بیرون یا دکمهٔ بستن
  document.querySelectorAll(".modal").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-close]")) {
        closeDialogs();
      }
    });
  });
}

function handleZen() {
  const active = toggleZen();
  const button = $("#btnZen");
  if (button)
    button.setAttribute(
      "aria-label",
      active ? "خروج از حالت مطالعه" : "حالت مطالعه",
    );
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
    onStep: step,
    onSearch: search.open,
    onTheme: toggleTheme,
    onPalette: () => {
      const next = cyclePalette();
      toast(`پالت: ${paletteLabel(next.id)}`);
    },
    onZen: handleZen,
    isTyping: () =>
      /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || ""),
  });

  const bookElement = $("#book");
  if (bookElement) bindSwipe(bookElement, step);

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
