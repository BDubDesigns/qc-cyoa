/**
 * Tiny dependency-free hash router.
 *
 * Routes are encoded in the URL hash: `#/route[?params]`.
 * Examples:  `#/play?game=lighthouse`, `#/studio`, `#/browse`, `#/account`
 * As a convenience a plain `?game=<id>` query (no hash) still routes to play.
 */
export type Route =
  | { name: "play"; game?: string }
  | { name: "studio"; game?: string }
  | { name: "browse" }
  | { name: "account" }
  | { name: "home" };

export function parseLocation(hash: string, search: string): Route {
  // If a plain query ?game= exists and there's no hash route, default to play.
  if (!hash || hash === "#") {
    const params = new URLSearchParams(search);
    if (params.has("game")) return { name: "play", game: params.get("game") ?? undefined };
    return { name: "home" };
  }
  const h = hash.slice(1); // drop '#'
  const qIdx = h.indexOf("?");
  const path = qIdx === -1 ? h : h.slice(0, qIdx);
  const query = qIdx === -1 ? "" : h.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  const segments = path.split("/").filter(Boolean);

  switch (segments[0]) {
    case "play":
      return { name: "play", game: params.get("game") ?? undefined };
    case "studio":
      return { name: "studio", game: params.get("game") ?? undefined };
    case "browse":
      return { name: "browse" };
    case "account":
      return { name: "account" };
    default:
      return { name: "home" };
  }
}

/** Serialize a route back into a hash string (without the leading '#'). */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case "play":
      return route.game ? `#/play?game=${encodeURIComponent(route.game)}` : "#/play";
    case "studio":
      return route.game ? `#/studio?game=${encodeURIComponent(route.game)}` : "#/studio";
    case "browse":
      return "#/browse";
    case "account":
      return "#/account";
    case "home":
      return "#/";
  }
}

/** Listen for hashchange + initial. Returns an unsubscribe. */
export function onRouteChange(fn: (route: Route) => void): () => void {
  const handler = () => fn(parseLocation(location.hash, location.search));
  handler();
  window.addEventListener("hashchange", handler);
  return () => window.removeEventListener("hashchange", handler);
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (location.hash !== hash) location.hash = hash;
}

/** Build a shareable URL to play a game by id. */
export function playUrl(gameId: string): string {
  const base = location.origin + location.pathname;
  return `${base}#/play?game=${encodeURIComponent(gameId)}`;
}

/** Build the studio URL for editing a game by id. */
export function studioUrl(gameId: string): string {
  const base = location.origin + location.pathname;
  return `${base}#/studio?game=${encodeURIComponent(gameId)}`;
}