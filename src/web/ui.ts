/**
 * Small shared UI helpers for the web shell: top nav, notices, and a utility
 * to render a simple message area.
 */
import { navigate, type Route } from "./router";

export function navBar(active: string): HTMLElement {
  const nav = document.createElement("nav");
  nav.className = "app-nav";

  const links: Array<{ label: string; route: Route; key: string }> = [
    { label: "Home", route: { name: "home" }, key: "home" },
    { label: "Browse", route: { name: "browse" }, key: "browse" },
    // Projects is the current creator workflow (Slice 0 asset library). The
    // legacy CYOA Studio is intentionally not in the primary nav — it's
    // surfaced from Home as a clearly-labelled legacy tool.
    { label: "Projects", route: { name: "projects" }, key: "projects" },
    { label: "Account", route: { name: "account" }, key: "account" },
  ];

  for (const link of links) {
    const a = document.createElement("a");
    a.className = "nav-link";
    a.textContent = link.label;
    if (link.key === active) a.classList.add("active");
    a.href = "#";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.route);
    });
    nav.appendChild(a);
  }
  return nav;
}

/** A muted single-line notice appended to a container. */
export function notice(container: HTMLElement, text: string, kind: "info" | "error" = "info"): HTMLElement {
  const d = document.createElement("div");
  d.className = `notice-line ${kind}`;
  d.textContent = text;
  container.appendChild(d);
  return d;
}

/** Wraps children in a `.app-panel` section. */
export function panel(title: string, body: HTMLElement): HTMLElement {
  const sec = document.createElement("section");
  sec.className = "app-panel panel";
  const h = document.createElement("h2");
  h.className = "panel-title";
  h.textContent = title;
  sec.append(h, body);
  return sec;
}

export function clearAndMount(root: HTMLElement, ...children: HTMLElement[]): void {
  root.replaceChildren(...children);
}