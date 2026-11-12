// CA Practice Extension - Universal Portal Adapter
// Automated form filler for all compliance, tax, labour, MSME, IP, and trade portals.

import { DomUtils } from "../core/dom-utils.js";

export class UniversalAdapter {
  constructor(portalConfig) {
    this.config = portalConfig || {};
  }

  fillLogin(credentials) {
    const userId =
      credentials.userId ||
      credentials.username ||
      credentials.mcaId ||
      credentials.pan ||
      credentials.email ||
      "";
    const password =
      credentials.password ||
      credentials.mcaPassword ||
      credentials.gstPassword ||
      credentials.incomeTaxPassword ||
      "";

    let filledId = false;
    let filledPwd = false;

    // 1. Fill User ID / Username field
    let userField = DomUtils.findFirstMatching(this.config.selectors?.userId || []);
    if (!userField) {
      // Heuristic fallback: find first visible text/email field that is not captcha or search
      const textInputs = DomUtils.queryAllDeep(
        "input[type='text'], input[type='email'], input:not([type])"
      )
        .filter(DomUtils.isVisible)
        .filter((inp) => {
          const str = (
            (inp.name || "") + " " + (inp.id || "") + " " + (inp.placeholder || "")
          ).toLowerCase();
          return !str.includes("captcha") && !str.includes("search");
        });
      if (textInputs.length > 0) userField = textInputs[0];
    }

    if (userField && userId) {
      filledId = DomUtils.setInputValue(userField, userId);
      DomUtils.highlightField(userField);
    }

    // 2. Fill Password field
    let pwdField = DomUtils.findFirstMatching(this.config.selectors?.password || []);
    if (!pwdField) {
      // Heuristic fallback: find first visible password field
      const pwdInputs = DomUtils.queryAllDeep("input[type='password']").filter(DomUtils.isVisible);
      if (pwdInputs.length > 0) pwdField = pwdInputs[0];
    }

    if (pwdField && password) {
      filledPwd = DomUtils.setInputValue(pwdField, password);
      DomUtils.highlightField(pwdField);
    }

    // 3. Auto-focus Captcha input if present
    const captchaSelectors = [
      ...(this.config.selectors?.captcha || []),
      "input#captcha",
      "input[name*='captcha' i]",
      "input[id*='captcha' i]",
      "input[placeholder*='captcha' i]",
      "input#txtCaptcha",
      "input#userCaptcha",
    ];
    DomUtils.focusCaptcha(captchaSelectors);

    // 4. Highlight Submit button if present
    const submitBtn = DomUtils.findFirstMatching(this.config.selectors?.submit || []);
    if (submitBtn) {
      DomUtils.highlightField(submitBtn, "#3b82f6");
    }

    return { filledId, filledPwd };
  }
}
