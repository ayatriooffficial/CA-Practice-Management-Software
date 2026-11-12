// CA Practice Extension - MCA Portal Adapter (V2 & V3)

import { DomUtils } from "../core/dom-utils.js";

export class McaAdapter {
  constructor(portalConfig) {
    this.config = portalConfig;
  }

  fillLogin(credentials) {
    const id = credentials.userId || credentials.mcaId || "";
    const pwd = credentials.password || credentials.mcaPassword || "";

    let filledId = false;
    let filledPwd = false;

    // 1. Find password field
    const pwdField = DomUtils.findFirstMatching(this.config.selectors.password);
    if (pwdField && pwd) {
      filledPwd = DomUtils.setInputValue(pwdField, pwd);
      DomUtils.highlightField(pwdField);
    }

    // 2. Find user ID field
    const idField = DomUtils.findFirstMatching(this.config.selectors.userId);
    if (idField && id) {
      filledId = DomUtils.setInputValue(idField, id);
      DomUtils.highlightField(idField);
    }

    // 3. Inject AEM guideBridge / jQuery helper script into main world for Adobe Adaptive Forms
    this.injectAemScript(id, pwd);

    // 4. Focus captcha
    DomUtils.focusCaptcha(this.config.selectors.captcha);

    return { filledId, filledPwd };
  }

  injectAemScript(mcaId, mcaPassword) {
    try {
      const script = document.createElement("script");
      script.textContent = `
        (function() {
          var id = ${JSON.stringify(mcaId || "")};
          var pwd = ${JSON.stringify(mcaPassword || "")};

          // 1. Adobe AEM GuideBridge
          try {
            if (window.guideBridge) {
              if (id) {
                var u = window.guideBridge.resolveNode("userID") || window.guideBridge.resolveNode("userName");
                if (u) u.value = id;
              }
              if (pwd) {
                var p = window.guideBridge.resolveNode("password") || window.guideBridge.resolveNode("pwd");
                if (p) p.value = pwd;
              }
            }
          } catch(e) {}

          // 2. jQuery triggers for MCA V2/V3
          try {
            var $ = window.$ || window.jQuery;
            if ($) {
              if (id) {
                $('input[name="userID"], input[id*="guidetextbox___widget"]').each(function() {
                  this.value = id;
                  $(this).attr("value", id).trigger('input').trigger('change');
                });
              }
              if (pwd) {
                $('input[type="password"], input[id*="guidepasswordbox___widget"]').each(function() {
                  this.value = pwd;
                  $(this).attr("value", pwd).trigger('input').trigger('change');
                });
              }
            }
          } catch(e) {}
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch {}
  }
}

