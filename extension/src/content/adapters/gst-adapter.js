// CA Practice Extension - GST Portal Adapter

import { DomUtils } from "../core/dom-utils.js";

export class GstAdapter {
  constructor(portalConfig) {
    this.config = portalConfig;
  }

  fillLogin(credentials) {
    const username = credentials.gstUsername || credentials.userId || "";
    const pwd = credentials.gstPassword || credentials.password || "";

    let filledId = false;
    let filledPwd = false;

    // Fill Username
    const userField = DomUtils.findFirstMatching(this.config.selectors.userId);
    if (userField && username) {
      filledId = DomUtils.setInputValue(userField, username);
      DomUtils.highlightField(userField);
    }

    // Fill Password
    const pwdField = DomUtils.findFirstMatching(this.config.selectors.password);
    if (pwdField && pwd) {
      filledPwd = DomUtils.setInputValue(pwdField, pwd);
      DomUtils.highlightField(pwdField);
    }

    // Focus Captcha
    DomUtils.focusCaptcha(this.config.selectors.captcha);

    return { filledId, filledPwd };
  }
}
