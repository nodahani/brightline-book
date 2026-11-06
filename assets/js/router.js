/* ==========================================================================
   router.js — مسیریابی بر پایهٔ hash
   آدرس‌ها: #/cover · #/chapter/:id · #/about
   چون از hash استفاده می‌کنیم، GitHub Pages هیچ درخواست اضافه‌ای نمی‌بیند
   و لینک‌های عمیق هرگز به ۴۰۴ نمی‌خورند.
   ========================================================================== */

const ROUTES = {
  cover: () => ({ type: "cover" }),
  about: () => ({ type: "about" }),
  chapter: (id) => (id ? { type: "chapter", id } : { type: "cover" }),
};

/** رشتهٔ hash را به یک شیء مسیر تبدیل می‌کند. */
export function parseHash(hash = window.location.hash) {
  const clean = (hash || "").replace(/^#\/?/, "");
  if (!clean) return { type: "cover" };

  const [name, ...rest] = clean.split("/");
  const build = ROUTES[name];

  if (!build) return { type: "cover" };
  if (name !== "chapter") return build();

  let id = "";
  try {
    id = decodeURIComponent(rest.join("/"));
  } catch {
    id = rest.join("/");
  }
  return build(id);
}

/** مسیر را به رشتهٔ hash برمی‌گرداند. */
export function toHash(route) {
  switch (route.type) {
    case "chapter":
      return `#/chapter/${encodeURIComponent(route.id)}`;
    case "about":
      return "#/about";
    default:
      return "#/cover";
  }
}

/** آیا این مسیر یک صفحهٔ واقعی کتاب است؟ */
export function isKnown(book, route) {
  if (route.type !== "chapter") return true;
  return book.chapters.some((chapter) => chapter.id === route.id);
}

/**
 * ناوبری را به hash گوش می‌دهد.
 * @param {(route: object) => void} onChange
 * @returns {() => void} تابع جداکردن شنونده
 */
export function onRouteChange(onChange) {
  const handler = () => onChange(parseHash());
  window.addEventListener("hashchange", handler);
  window.addEventListener("popstate", handler);
  return () => {
    window.removeEventListener("hashchange", handler);
    window.removeEventListener("popstate", handler);
  };
}

/**
 * به یک مسیر می‌رود. اگر همان مسیر جاری باشد، دوباره رندر نمی‌کند.
 * @param {object} route
 * @param {{ replace?: boolean }} options
 */
export function navigate(route, { replace = false } = {}) {
  const hash = toHash(route);
  if (window.location.hash === hash) return;

  if (replace) {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
