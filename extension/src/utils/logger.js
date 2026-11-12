// CA Practice Extension - Tagged Logger Utility

class Logger {
  constructor(tag = "CA Practice") {
    this.tag = `[${tag}]`;
  }

  log(...args) {
    console.log(this.tag, ...args);
  }

  info(...args) {
    console.info(this.tag, ...args);
  }

  warn(...args) {
    console.warn(this.tag, ...args);
  }

  error(...args) {
    console.error(this.tag, ...args);
  }

  create(subTag) {
    return new Logger(`${this.tag.slice(1, -1)}:${subTag}`);
  }
}

export const logger = new Logger("CA Practice");
