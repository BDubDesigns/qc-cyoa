/**
 * Registry of demo games. These are always available (bundled, offline) and
 * serve as the fallback when the API is down or the game id is one of the
 * shipped demos. New user-authored games live in the DB instead and are loaded
 * via the API.
 */
import type { GameDefinition } from "../core/types";
import { lighthouse } from "../games/lighthouse";
import { postOffice } from "../games/post_office";

const registry = new Map<string, () => GameDefinition>([
  [lighthouse.id, () => lighthouse],
  [postOffice.id, () => postOffice],
]);

export function registeredGameIds(): string[] {
  return [...registry.keys()];
}

export function loadGameById(id: string): GameDefinition | undefined {
  const factory = registry.get(id);
  return factory ? factory() : undefined;
}