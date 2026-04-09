function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!canUseStorage()) return fallback;

    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string) {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(key);
  }
};

