
export const STORAGE_KEYS = {
  ACCOUNTS: 'aurumwolf_accounts',
  TRANSACTIONS: 'aurumwolf_transactions',
  BUDGETS: 'aurumwolf_budgets',
  GOALS: 'aurumwolf_goals',
  INVESTMENTS: 'aurumwolf_investments',
  BUSINESS_ENTITIES: 'aurumwolf_business_entities',
  BASE_CURRENCY: 'aurumwolf_base_currency',
  PRIVACY: 'aurumwolf_privacy',
  LANGUAGE: 'aurumwolf_language',
  VERSION: 'aurumwolf_storage_version'
} as const;

const CURRENT_VERSION = '1.3';

export function getJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    // Handle "undefined" string edge case or null
    if (!item || item === 'undefined' || item === 'null') return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading ${key} from storage, using fallback.`, error);
    return fallback;
  }
}

/**
 * Safely loads an array from storage. 
 * If the data is corrupt (not an array), returns the fallback.
 */
export function getSafeArray<T>(key: string, fallback: T[]): T[] {
  const data = getJSON(key, fallback);
  if (!Array.isArray(data)) {
    console.warn(`[Data Integrity] Corrupt data found for ${key}. Resetting to fallback.`);
    return fallback;
  }
  return data;
}

export function setJSON(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
}

export function migrateIfNeeded() {
  if (typeof window === 'undefined') return;

  const version = window.localStorage.getItem(STORAGE_KEYS.VERSION);

  if (!version) {
    // New install or legacy data. 
    // We assume legacy data is compatible for now.
    // The getJSON helper's try/catch will handle simple string -> JSON migration implicitly 
    // (e.g. currency 'USD' -> "USD").
    window.localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
    return;
  }

  if (version !== CURRENT_VERSION) {
    console.log(`Migrating storage from ${version} to ${CURRENT_VERSION}`);
    // Future migrations would go here
    window.localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  }
}

export function clearData() {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach(key => {
    window.localStorage.removeItem(key);
  });
}
