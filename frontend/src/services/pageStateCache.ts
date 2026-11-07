/**
 * Page State Cache Service
 *
 * Caches loaded data and UI state for app sections (Home, Team, Groups, Invoice, PDF Signer, etc.)
 * so that when a user revisits a loaded section, it renders instantly without showing
 * progress bars, loading spinners, or reload flickers.
 */

/**
 * Resolves any path, route, or cache key into a canonical section identifier.
 * Examples:
 *   '/' -> 'home'
 *   '/team' -> 'team'
 *   '/team?tab=attendance' -> 'team'
 *   '/pdf-signer' -> 'pdf-signer'
 *   '/dsc/pdf-signer' -> 'pdf-signer'
 *   'pdf_signer_page_data' -> 'pdf-signer'
 *   'home_dashboard_data' -> 'home'
 */
export function getCanonicalSection(pathOrKey?: string): string {
  if (!pathOrKey) return 'home';
  const clean = pathOrKey.toString().split('?')[0].split('#')[0].trim().toLowerCase();

  if (clean.includes('pdf-signer')) return 'pdf-signer';
  if (clean.includes('home_dashboard') || clean === '/' || clean === '' || clean === 'home') return 'home';

  const stripped = clean.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!stripped) return 'home';

  const firstPart = stripped.split('/')[0];
  return firstPart || 'home';
}

export class PageStateCache {
  private cache = new Map<string, any>();
  private loadedSections = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedSections = sessionStorage.getItem('turia_loaded_sections');
        if (storedSections) {
          const list: string[] = JSON.parse(storedSections);
          list.forEach((s) => this.loadedSections.add(getCanonicalSection(s)));
        }
        // Also check any existing app_loaded_ or turia_loaded_ keys
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('turia_loaded_') || k.startsWith('app_loaded_')) {
            const raw = k.replace(/^turia_loaded_|^app_loaded_/, '');
            this.loadedSections.add(getCanonicalSection(raw));
          }
        });
      } catch {}
    }
  }

  /**
   * Permanently marks a section / path as loaded for the current user session.
   */
  public markLoaded(pathOrSection: string): void {
    const section = getCanonicalSection(pathOrSection);
    this.loadedSections.add(section);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`turia_loaded_${section}`, '1');
        const list = Array.from(this.loadedSections);
        sessionStorage.setItem('turia_loaded_sections', JSON.stringify(list));
      } catch {}
    }
  }

  /**
   * Checks if a section or route has already been visited and loaded.
   */
  public isLoaded(pathOrSection: string): boolean {
    const section = getCanonicalSection(pathOrSection);
    if (this.loadedSections.has(section)) return true;
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(`turia_loaded_${section}`) !== null) {
          this.loadedSections.add(section);
          return true;
        }
      } catch {}
    }
    return false;
  }

  public isPathLoaded(path: string): boolean {
    return this.isLoaded(path);
  }

  public isSectionLoaded(section: string): boolean {
    return this.isLoaded(section);
  }

  /**
   * Stores data in memory, session storage, and local storage under both specific key and canonical section.
   */
  public set(key: string, data: any): void {
    if (!key || data === undefined) return;
    const section = getCanonicalSection(key);
    this.cache.set(key, data);
    if (section && section !== key) {
      this.cache.set(section, data);
    }
    this.markLoaded(section);
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(data);
        sessionStorage.setItem(`turia_cache_key_${key}`, serialized);
        sessionStorage.setItem(`turia_cache_${section}`, serialized);
        localStorage.setItem(`turia_cache_key_${key}`, serialized);
        localStorage.setItem(`turia_cache_${section}`, serialized);
      } catch {}
    }
  }

  /**
   * Retrieves data from memory, session storage, or local storage.
   */
  public get<T = any>(key: string): T | undefined {
    if (!key) return undefined;
    // 1. In-memory exact key hit
    if (this.cache.has(key)) return this.cache.get(key) as T;

    // 2. Storage exact key hit
    if (typeof window !== 'undefined') {
      try {
        const storedKey = sessionStorage.getItem(`turia_cache_key_${key}`) || localStorage.getItem(`turia_cache_key_${key}`);
        if (storedKey) {
          const parsed = JSON.parse(storedKey);
          this.cache.set(key, parsed);
          return parsed as T;
        }
      } catch {}
    }

    // 3. Fallback to section key hit
    const section = getCanonicalSection(key);
    if (this.cache.has(section)) return this.cache.get(section) as T;

    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`turia_cache_${section}`) || localStorage.getItem(`turia_cache_${section}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.cache.set(section, parsed);
          this.markLoaded(section);
          return parsed as T;
        }
      } catch {}
    }
    return undefined;
  }

  public has(key: string): boolean {
    if (this.cache.has(key)) return true;
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(`turia_cache_key_${key}`) !== null || localStorage.getItem(`turia_cache_key_${key}`) !== null) {
          return true;
        }
      } catch {}
    }
    const section = getCanonicalSection(key);
    if (this.cache.has(section)) return true;
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(`turia_cache_${section}`) !== null || localStorage.getItem(`turia_cache_${section}`) !== null;
      } catch {}
    }
    return false;
  }

  public clear(): void {
    this.cache.clear();
    this.loadedSections.clear();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('turia_loaded_sections');
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('turia_') || k.startsWith('app_')) {
            sessionStorage.removeItem(k);
          }
        });
      } catch {}
    }
  }
}

// Global window singleton to share across all code-split chunks
function getGlobalCache(): PageStateCache {
  if (typeof window === 'undefined') {
    return new PageStateCache();
  }
  const w = window as any;
  if (!w.__TURIA_PAGE_CACHE__) {
    w.__TURIA_PAGE_CACHE__ = new PageStateCache();
  }
  return w.__TURIA_PAGE_CACHE__;
}

export const pageStateCache = getGlobalCache();
