/* ==========================================================================
   ui.js — تعامل‌های رابط کاربری
   تم، پالت رنگ، مودال، جست‌وجو، حالت مطالعه، میان‌برها و ورق زدن با لمس
   ========================================================================== */

import { escapeText, highlight, search } from "./search.js";
import { icon } from "./views.js";

const THEME_KEY = "khat-roshan/theme";
const PALETTE_KEY = "khat-roshan/palette";

const THEMES = ["light", "dark"];

// یک دکمه برای هر دو کار: روشن/تاریک عوض می‌شود و بعد پالت جلو می‌رود.
// هر پالت نسخهٔ روشن و تاریک دارد، پس این دو تنظیم با هم یک «پوسته» می‌سازند.
const PALETTES = [
  { id: "sepia", label: "سپیا", icon: "#i-sun" },
  { id: "moon", label: "مهتاب", icon: "#i-moon" },
  { id: "paper", label: "کاغذ", icon: "#i-palette" },
  { id: "charcoal", label: "زغال", icon: "#i-expand" },
];

/* حافظهٔ مرورگر ممکن است در iframe سندباکس بسته باشد */
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* بی‌صدا رد می‌شویم؛ ظاهر سایت به حافظه وابسته نیست */
    }
  },
};

/* ---------- تم ---------- */

const paletteOf = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];

export function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : THEMES[0];
  document.documentElement.dataset.theme = next;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim();
    if (bg) meta.setAttribute("content", bg);
  }
}

export function applyPalette(id) {
  const palette = paletteOf(id);
  document.documentElement.dataset.palette = palette.id;

  // شناسه روی خودِ <use> است، نه روی <svg> والد؛ هر دو حالت را می‌پذیریم.
  const iconEl =
    document.querySelector("#themeIcon") ||
    document.querySelector("#themeIcon use");
  if (iconEl) iconEl.setAttribute("href", palette.icon);
}

export function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set(THEME_KEY, next);
  return next;
}

export function cyclePalette() {
  const current = document.documentElement.dataset.palette || PALETTES[0].id;
  const index = PALETTES.findIndex((p) => p.id === current);
  const next = PALETTES[(index + 1) % PALETTES.length];
  applyPalette(next.id);
  store.set(PALETTE_KEY, next.id);
  return next;
}

/**
 * چرخهٔ کامل پوسته‌ها: ۴ پالت × ۲ تم = ۸ حالت، یکی‌یکی و بدون تکرار.
 *
 * نسخهٔ قبلی هم‌زمان پالت و تم را جلو می‌برد. چون هر دو با هم عوض می‌شدند،
 * فقط ۴ حالت از ۸ حالت دیده می‌شد (همیشه روشن/تاریکِ یک جفتِ ثابت) و کاربر
 * هیچ‌وقت به بقیه نمی‌رسید. حالا اول همهٔ پالت‌ها با تم فعلی می‌آیند، بعد تم
 * عوض می‌شود و همان مسیر تکرار می‌شود.
 */
export function cycleSkin() {
  const palette = cyclePalette();

  // اگر پالت به اول برگشت، یعنی یک دور کامل شد: حالا تم را عوض کن.
  if (palette.id === PALETTES[0].id) {
    const theme = toggleTheme();
    return { theme, palette };
  }

  return { theme: currentTheme(), palette };
}

export const currentTheme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const paletteLabel = (id) => paletteOf(id).label;

export function initTheme(defaultPalette = "sepia") {
  const savedTheme = store.get(THEME_KEY);
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)",
  ).matches;
  applyPalette(store.get(PALETTE_KEY) || defaultPalette);
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

/* ---------- حالت مطالعه ---------- */

export function toggleZen() {
  const active = document.body.classList.toggle("is-zen");
  const button = document.querySelector("#btnZen");
  if (button) {
    button.setAttribute("aria-pressed", String(active));
    button.title = active ? "خروج از حالت مطالعه" : "حالت مطالعه";
  }
  return active;
}

/* ---------- توست ---------- */

let toastTimer = null;

export function toast(message, { ms = 2400 } = {}) {
  const element = document.querySelector("#toast");
  const text = document.querySelector("#toastText");
  if (!element || !text) return;

  text.textContent = message;
  element.classList.add("is-visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("is-visible"), ms);
}

/* ---------- مودال ---------- */

let lastFocused = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** فوکوس را داخل مودال نگه می‌دارد تا Tab به پشت صحنه نرود. */
function trapFocus(dialog, event) {
  if (event.key !== "Tab") return;

  const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  if (!items.length) return;

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export function openDialog(dialog) {
  if (!dialog) return;
  lastFocused = document.activeElement;
  document.querySelectorAll(".modal.is-open").forEach((open) => {
    if (open !== dialog) open.classList.remove("is-open");
  });
  dialog.classList.add("is-open");
  document.body.style.overflow = "hidden";

  dialog.addEventListener("keydown", (event) => trapFocus(dialog, event));
}

export function closeDialogs() {
  const open = document.querySelectorAll(".modal.is-open");
  if (!open.length) return;

  open.forEach((dialog) => dialog.classList.remove("is-open"));
  document.body.style.overflow = "";

  if (lastFocused instanceof HTMLElement) lastFocused.focus();
  lastFocused = null;
}

export const anyDialogOpen = () =>
  document.querySelector(".modal.is-open") !== null;

/* ---------- جست‌وجو ---------- */

/**
 * مودال جست‌وجو را سیم‌کشی می‌کند.
 * @param {{ dialog: HTMLElement, input: HTMLInputElement, results: HTMLElement, index: () => object[] }} options
 */
export function setupSearch({ dialog, input, results, index }) {
  const render = (query) => {
    if (query.trim().length < 2) {
      results.innerHTML = `
        <p class="search-hint">
          دستِ‌کم دو حرف بنویس. جست‌وجو در عنوان و متنِ همهٔ فصل‌ها انجام می‌شود.
          <br />بستن: <kbd>Esc</kbd>
        </p>`;
      return;
    }

    const found = search(index(), query);

    if (!found.length) {
      results.innerHTML =
        '<p class="search-empty">چیزی پیدا نشد. واژهٔ دیگری امتحان کن.</p>';
      return;
    }

    results.innerHTML = found
      .map(
        (result) => `
          <a class="search-result" href="#/chapter/${encodeURIComponent(result.id)}${
            result.slug ? `/${encodeURIComponent(result.slug)}` : ""
          }">
            <span class="search-result__where">${escapeText(result.where)}</span>
            <span class="search-result__text">${highlight(result.text, query)}</span>
          </a>`,
      )
      .join("");
  };

  const open = () => {
    openDialog(dialog);
    input.value = "";
    render("");
    requestAnimationFrame(() => input.focus());
  };

  input.addEventListener("input", (event) => render(event.target.value));

  // بستن پس از رفتن به نتیجه
  results.addEventListener("click", (event) => {
    if (event.target.closest(".search-result")) closeDialogs();
  });

  return { open, render };
}

/* ---------- میان‌برها و لمس ---------- */

/**
 * @param {{
 *   onSearch: () => void,
 *   onTheme: () => void,
 *   onPalette: () => void,
 *   onZen: () => void,
 *   onSidebarClose: () => void,
 *   isTyping: () => boolean
 * }} handlers
 */
export function bindGlobalKeys(handlers) {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      // ترتیب: مودال، بعد کشوی فهرست، بعد حالت تمرکز.
      if (anyDialogOpen()) {
        closeDialogs();
      } else if (
        document.querySelector("#shell")?.classList.contains("is-sidebar-open") &&
        !window.matchMedia("(min-width: 980px)").matches
      ) {
        handlers.onSidebarClose?.();
      } else if (document.body.classList.contains("is-zen")) {
        handlers.onZen();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      handlers.onSearch();
      return;
    }

    if (handlers.isTyping() || anyDialogOpen()) return;


    switch (event.key.toLowerCase()) {
      case "t":
        handlers.onTheme();
        break;
      case "p":
        handlers.onPalette();
        break;
      case "z":
        handlers.onZen();
        break;
      default:
        break;
    }
  });
}

/** ورق زدن با کشیدن انگشت روی کتاب. */
export function bindSwipe(element, onStep, { threshold = 70 } = {}) {
  let startX = null;
  let startY = null;
  let ignoring = false;

  const reset = () => {
    startX = null;
    startY = null;
    ignoring = false;
  };

  element.addEventListener(
    "touchstart",
    (event) => {
      // لمس چند‌انگشتی (زوم) هرگز نباید صفحه را عوض کند.
      if (event.touches.length > 1) {
        ignoring = true;
        return;
      }
      ignoring = false;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    { passive: true },
  );

  // اگر کاربر در حین کشیدن عمودی اسکرول کند، اصلاً ورق نمی‌زنیم.
  element.addEventListener(
    "touchmove",
    (event) => {
      if (ignoring || startX === null) return;
      if (event.touches.length > 1) {
        ignoring = true;
        reset();
        return;
      }
      const dx = Math.abs(event.touches[0].clientX - startX);
      const dy = Math.abs(event.touches[0].clientY - startY);
      if (dy > 12 && dy > dx) ignoring = true;
    },
    { passive: true },
  );

  element.addEventListener(
    "touchend",
    (event) => {
      if (ignoring || startX === null) return reset();

      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      reset();

      // حرکت باید افقیِ غالب باشد؛ یک اسکرول عمودیِ کج نباید فصل را عوض کند.
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy) * 2) return;

      onStep(dx > 0 ? -1 : 1);
    },
    { passive: true },
  );

  element.addEventListener("touchcancel", reset, { passive: true });
}

/* ---------- پیام خطا ---------- */

export function showFatal(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="fatal">
      <strong>${escapeText(message)}</strong>
      <p>
        مسیر فایل‌ها را بررسی کن. اگر فایل را مستقیم از دیسک باز کرده‌ای، مرورگر اجازهٔ خواندن
        <code>content/book.json</code> را نمی‌دهد؛ یک سرور محلی اجرا کن: <code>python3 -m http.server</code>
      </p>
      ${icon("info")}
    </div>`;
}
