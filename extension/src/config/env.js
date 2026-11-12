// CA Practice Extension - Environment & Deployment Configuration

export const ENV = {
  EXTENSION_VERSION: "2.0.0",
  EXTENSION_NAME: "CA Practice - Portal Auto-Fill Assistant",

  // Default API fallbacks if auto-detection has not yet recorded the origin
  DEFAULT_LOCAL_API: "http://localhost:5000/api/v1",
  DEFAULT_LOCAL_APP: "http://localhost:3000",

  // Known deployment wildcard patterns for practice management web apps
  TRUSTED_APP_DOMAINS: [
    "localhost",
    "127.0.0.1",
    "ayatrio.com",
    "*.ayatrio.com",
    "*.vercel.app",
    "*.netlify.app",
    "*.onrender.com",
    "*.railway.app",
    "*.fly.dev",
  ],

  // Check if a URL origin belongs to a trusted web app instance
  isTrustedAppOrigin(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      return this.TRUSTED_APP_DOMAINS.some((pattern) => {
        if (pattern === host) return true;
        if (pattern.startsWith("*.")) {
          const suffix = pattern.slice(2);
          return host === suffix || host.endsWith("." + suffix);
        }
        return false;
      });
    } catch {
      return false;
    }
  },
};
