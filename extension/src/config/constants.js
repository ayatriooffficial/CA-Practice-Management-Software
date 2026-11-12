// CA Practice Extension - Storage Keys & Message Action Constants

export const STORAGE_KEYS = {
  ACTIVE_CLIENT: "activeClient",
  CACHED_CLIENTS: "cachedClients",
  PENDING_CREDENTIALS: "pendingCredentials", // keyed by portal or active portal
  LAST_USED_CREDENTIALS: "lastUsedCredentials",
  APP_ORIGINS: "appOrigins", // Array of detected or configured web app origins
  CUSTOM_DOMAINS: "customDomains", // User-defined web app domains
  BACKEND_API_URL: "backendApiUrl",
  SETTINGS: "extensionSettings",
  ACTIVE_PORTAL_ID: "activePortalId",
};

export const ACTIONS = {
  // Web App <-> Extension
  REGISTER_APP_INSTANCE: "REGISTER_APP_INSTANCE",
  SET_ACTIVE_CLIENT: "SET_ACTIVE_CLIENT",
  SYNC_CLIENTS: "SYNC_CLIENTS",
  AUTOFILL_PORTAL: "AUTOFILL_PORTAL",
  AUTOFILL_MCA: "AUTOFILL_MCA", // backward compatibility
  CHECK_EXTENSION: "CHECK_EXTENSION",

  // Popup <-> Background
  GET_POPUP_DATA: "GET_POPUP_DATA",
  SEARCH_CLIENTS: "SEARCH_CLIENTS",
  OPEN_PORTAL_AND_FILL: "OPEN_PORTAL_AND_FILL",
  FILL_CURRENT_TAB: "FILL_CURRENT_TAB",
  UPDATE_CREDENTIALS: "UPDATE_CREDENTIALS",
  SWITCH_PORTAL: "SWITCH_PORTAL",

  // Content Script <-> Background
  GET_PORTAL_CREDENTIALS: "GET_PORTAL_CREDENTIALS",
  REPORT_FILL_STATUS: "REPORT_FILL_STATUS",
  DISMISS_FLOATING_WIDGET: "DISMISS_FLOATING_WIDGET",
};

export const DEFAULT_SETTINGS = {
  autoFillEnabled: true,
  showFloatingWidget: true,
  autoFocusCaptcha: true,
  rememberLastDirector: true,
  debugLogging: false,
};
