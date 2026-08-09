import type { Href } from 'expo-router';

/**
 * Client-side validation of the assistant's navigate actions.
 *
 * The backend already allowlists routes and sheets, so this is the second of
 * two gates rather than the only one. It exists because the two lists can drift
 * — a route renamed here but not there would otherwise hand `router.push()` a
 * path that doesn't exist and crash the navigator. Anything unrecognised
 * degrades to "no button", never to a bad push.
 */

/** Routes the assistant may send the user to. Must exist in src/app/. */
const ROUTES = {
  '/': '/',
  '/expenses': '/(tabs)/expenses',
  '/budget': '/(tabs)/budget',
  '/trends': '/(tabs)/trends',
  '/profile': '/profile',
  '/manage/categories': '/manage/categories',
  '/manage/accounts': '/manage/accounts',
  '/manage/tags': '/manage/tags',
} as const;

export type AssistantRoute = keyof typeof ROUTES;

/** Sheets the assistant may ask the destination screen to open on arrival. */
export const SHEETS = [
  'add-transaction',
  'budget-edit',
  'month-picker',
  'category-grid',
  'change-password',
  'upload-statements',
] as const;

export type AssistantSheet = (typeof SHEETS)[number];

/**
 * Which sheets each route can actually open. A sheet asked for on the wrong
 * screen is dropped rather than honoured, so the user lands somewhere sensible
 * instead of on a screen that silently ignores the request.
 * `add-transaction` and `month-picker` are global (the tab bar hosts them).
 */
const GLOBAL_SHEETS: readonly AssistantSheet[] = ['add-transaction', 'month-picker'];

const ROUTE_SHEETS: Record<AssistantRoute, readonly AssistantSheet[]> = {
  '/': [],
  '/expenses': ['category-grid'],
  '/budget': ['budget-edit'],
  '/trends': [],
  '/profile': ['change-password', 'upload-statements'],
  '/manage/categories': [],
  '/manage/accounts': [],
  '/manage/tags': [],
};

export type NavigateAction = {
  route: AssistantRoute;
  href: Href;
  sheet?: AssistantSheet;
  label: string;
};

function isRoute(value: unknown): value is AssistantRoute {
  return typeof value === 'string' && value in ROUTES;
}

function isSheet(value: unknown): value is AssistantSheet {
  return typeof value === 'string' && (SHEETS as readonly string[]).includes(value);
}

/**
 * Validate a navigate event from the stream. Returns null when the action is
 * unusable — the caller then renders the reply with no button attached.
 */
export function parseNavigateAction(raw: {
  route?: string;
  open?: string;
  label?: string;
}): NavigateAction | null {
  if (!isRoute(raw.route)) return null;

  const route = raw.route;
  let sheet: AssistantSheet | undefined;
  if (isSheet(raw.open)) {
    const allowed = GLOBAL_SHEETS.includes(raw.open) || ROUTE_SHEETS[route].includes(raw.open);
    if (allowed) sheet = raw.open;
  }

  const label = (raw.label ?? '').trim().slice(0, 40) || 'Take me there';
  return { route, href: ROUTES[route] as Href, sheet, label };
}
