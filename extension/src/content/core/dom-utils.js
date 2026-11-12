// CA Practice Extension - Universal DOM Utilities & Form Automation Engine

export const DomUtils = {
  /**
   * Determine whether an element is visible in the viewport
   */
  isVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch {
      return false;
    }
  },

  /**
   * Recursive selector query piercing all Shadow DOM boundaries
   */
  queryAllDeep(selector, root = document) {
    let results = [];
    try {
      results = results.concat(Array.from(root.querySelectorAll(selector)));
      const allElements = root.querySelectorAll("*");
      for (const el of allElements) {
        if (el.shadowRoot) {
          results = results.concat(this.queryAllDeep(selector, el.shadowRoot));
        }
      }
    } catch {}
    return results;
  },

  /**
   * Find the first visible element matching any of the given selectors
   */
  findFirstMatching(selectors = [], root = document) {
    for (const sel of selectors) {
      const matches = this.queryAllDeep(sel, root);
      const visible = matches.filter(this.isVisible);
      if (visible.length > 0) return visible[0];
      if (matches.length > 0) return matches[0];
    }
    return null;
  },

  /**
   * Framework-safe input filler.
   * Handles React synthetic event tracking, Angular ngModel, Vue, and native setters.
   */
  setInputValue(inputElement, value) {
    if (!inputElement || value == null) return false;

    try {
      inputElement.focus();

      // 1. Native prototype setter to bypass React 16+ value tracker
      const prototype = Object.getPrototypeOf(inputElement);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor && descriptor.set) {
        descriptor.set.call(inputElement, value);
      } else {
        inputElement.value = value;
      }

      // 2. Clear React internal value tracker if present
      if (inputElement._valueTracker) {
        inputElement._valueTracker.setValue("" + Math.random());
      }

      // 3. Dispatch full spectrum of input, key, and change events
      inputElement.dispatchEvent(new Event("focus", { bubbles: true }));
      inputElement.dispatchEvent(new Event("keydown", { bubbles: true }));
      inputElement.dispatchEvent(new Event("keypress", { bubbles: true }));
      inputElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      inputElement.dispatchEvent(new Event("keyup", { bubbles: true }));
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
      inputElement.dispatchEvent(new Event("blur", { bubbles: true }));

      return true;
    } catch (err) {
      console.warn("[DomUtils] Error setting input value:", err);
      try {
        inputElement.value = value;
        return true;
      } catch {
        return false;
      }
    }
  },

  /**
   * Highlight field briefly to give visual feedback to the user
   */
  highlightField(el, color = "#22c55e") {
    if (!el) return;
    try {
      const origBorder = el.style.borderColor;
      const origBoxShadow = el.style.boxShadow;
      const origTransition = el.style.transition;

      el.style.transition = "all 0.3s ease";
      el.style.borderColor = color;
      el.style.boxShadow = `0 0 0 3px ${color}40`;

      setTimeout(() => {
        el.style.borderColor = origBorder;
        el.style.boxShadow = origBoxShadow;
        el.style.transition = origTransition;
      }, 1500);
    } catch {}
  },

  /**
   * Auto-focus on captcha field so the user only has to type captcha and press enter
   */
  focusCaptcha(captchaSelectors = [], root = document) {
    const captcha = this.findFirstMatching(captchaSelectors, root);
    if (captcha) {
      setTimeout(() => {
        captcha.focus();
        this.highlightField(captcha, "#f59e0b");
      }, 300);
      return true;
    }
    return false;
  },
};
