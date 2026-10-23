/**
 * Base API Client for Ayatrio CRM
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  public statusCode: number;
  public errors?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode: number, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function normalizeId(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalizeId);
  }
  const normalized = { ...obj };
  if (normalized._id && !normalized.id) {
    normalized.id = String(normalized._id);
  }
  return normalized;
}

// Global active refresh promise to coalesce concurrent 401s into a single refresh call
let activeRefreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Refresh failed');
      }

      const json = await res.json();
      const newAccessToken = json.data?.accessToken;

      if (newAccessToken && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('turia_current_user');
          if (stored) {
            const user = JSON.parse(stored);
            user.token = newAccessToken;
            localStorage.setItem('turia_current_user', JSON.stringify(user));
          }
        } catch {}
      }

      return newAccessToken || null;
    } catch {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('turia_current_user');
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch {}
      }
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const authHeaders: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('turia_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) authHeaders['X-User-Id'] = u.id;
        if (u.role) authHeaders['X-User-Role'] = u.role;
        if (u.orgId || u.organization) authHeaders['X-Org-Id'] = u.orgId || u.organization;
        if (u.token) authHeaders['Authorization'] = `Bearer ${u.token}`;
      }
    } catch {}
  }

  const defaultHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...authHeaders,
  };

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // Handle 401 Unauthorized with automatic token refresh (skip for auth login/refresh routes)
  const isAuthRoute = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/refresh') || endpoint.startsWith('/auth/verify-otp');
  const hasToken = Boolean(authHeaders['Authorization']);
  if (response.status === 401 && !isRetry && !isAuthRoute && hasToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry original request once with new token
      return request<T>(
        endpoint,
        {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        },
        true
      );
    }
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errors: Array<{ field: string; message: string }> | undefined = undefined;

    if (isJson) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errors = errorData.errors;
      } catch {
        // Fallback to text
      }
    }

    throw new ApiError(errorMessage, response.status, errors);
  }

  if (response.status === 204) {
    return {
      success: true,
      statusCode: 204,
      message: 'No content',
      data: null as unknown as T,
    };
  }

  const jsonResult = (await response.json()) as ApiResponse<T>;
  if (jsonResult && jsonResult.data) {
    jsonResult.data = normalizeId(jsonResult.data);
  }

  return jsonResult;
}
