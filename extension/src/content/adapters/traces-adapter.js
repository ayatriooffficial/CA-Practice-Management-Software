// CA Practice Extension - TRACES (TDS CPC) Portal Adapter

import { DomUtils } from "../core/dom-utils.js";

export class TracesAdapter {
  constructor(portalConfig) {
    this.config = portalConfig;
  }

  fillLogin(credentials) {
    const userId = credentials.tracesUserId || credentials.userId || "";
    const pwd = credentials.tracesPassword || credentials.password || "";

    let filledId = false;
    let filledPwd = false;

    // Fill User ID
    const userField = DomUtils.findFirstMatching(this.config.selectors.userId);
    if (userField && userId) {
      filledId = DomUtils.setInputValue(userField, userId);
      DomUtils.highlightField(userField);
    }

    // Fill Password
    const pwdField = DomUtils.findFirstMatching(this.config.selectors.password);
    if (pwdField && pwd) {
      filledPwd = DomUtils.setInputValue(pwdField, pwd);
      DomUtils.highlightField(pwdField);
    }

    // Fill TAN if present on page
    if (credentials.tan || credentials.clientPan) {
      const tanField = DomUtils.findFirstMatching(["input#tan", "input[name*='tan' i]"]);
      if (tanField) {
        DomUtils.setInputValue(tanField, credentials.tan || credentials.clientPan);
        DomUtils.highlightField(tanField);
      }
    }

    // Focus Captcha
    DomUtils.focusCaptcha(this.config.selectors.captcha);

    return { filledId, filledPwd };
  }
}
