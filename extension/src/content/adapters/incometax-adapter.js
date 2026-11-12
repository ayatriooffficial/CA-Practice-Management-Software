// CA Practice Extension - Income Tax e-Filing (ITD) Portal Adapter

import { DomUtils } from "../core/dom-utils.js";

export class IncomeTaxAdapter {
  constructor(portalConfig) {
    this.config = portalConfig;
  }

  fillLogin(credentials) {
    const pan = credentials.pan || credentials.userId || "";
    const pwd = credentials.incomeTaxPassword || credentials.password || "";

    let filledId = false;
    let filledPwd = false;

    // Check if on Step 1: PAN / User ID input
    const panField = DomUtils.findFirstMatching(this.config.selectors.userId);
    if (panField && pan) {
      filledId = DomUtils.setInputValue(panField, pan);
      DomUtils.highlightField(panField);

      // Highlight continue button
      const continueBtn = DomUtils.findFirstMatching(this.config.selectors.submit);
      if (continueBtn) DomUtils.highlightField(continueBtn, "#3b82f6");
    }

    // Check if on Step 2: Password input
    const pwdField = DomUtils.findFirstMatching(this.config.selectors.password);
    if (pwdField && pwd) {
      filledPwd = DomUtils.setInputValue(pwdField, pwd);
      DomUtils.highlightField(pwdField);

      // Auto-check the ITD "Please confirm your secure access message" checkbox if present
      const confirmCheckbox = DomUtils.queryAllDeep("input[type='checkbox']").find(DomUtils.isVisible);
      if (confirmCheckbox && !confirmCheckbox.checked) {
        confirmCheckbox.click();
      }
    }

    // Focus Captcha if present
    DomUtils.focusCaptcha(this.config.selectors.captcha);

    return { filledId, filledPwd };
  }
}
