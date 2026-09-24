// Shared light/dark/system theme toggle. No build step, no dependencies:
// just localStorage (guarded) plus the data-theme attribute tokens.css reads.

const KEY = "unobeyable.theme";

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function setStoredTheme(value) {
  try {
    if (value === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // localStorage unavailable (private mode, disabled storage). The toggle
    // still works for the rest of this page load; it just won't persist.
  }
}

export function applyTheme(value) {
  if (value === "light" || value === "dark") {
    document.documentElement.setAttribute("data-theme", value);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/**
 * Wires a three-button [data-theme-btn="light|dark|system"] group inside
 * `root` to applyTheme/setStoredTheme, and applies the stored choice now.
 */
export function initThemeToggle(root) {
  const current = getStoredTheme();
  applyTheme(current);
  const buttons = root.querySelectorAll("[data-theme-btn]");
  for (const btn of buttons) {
    btn.setAttribute("aria-pressed", String(btn.dataset.themeBtn === current));
    btn.addEventListener("click", () => {
      const value = btn.dataset.themeBtn;
      applyTheme(value);
      setStoredTheme(value);
      for (const b of buttons) b.setAttribute("aria-pressed", String(b === btn));
    });
  }
}
