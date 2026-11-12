// CA Practice Extension - Storage Wrapper

export const Storage = {
  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (res) => {
        resolve(res || {});
      });
    });
  },

  async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve(true);
      });
    });
  },

  async remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve(true);
      });
    });
  },

  async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve(true);
      });
    });
  },
};

