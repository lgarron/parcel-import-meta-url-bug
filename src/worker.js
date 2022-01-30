export const WORKER_ENTRY_FILE_URL = import.meta.url;
console.log("WORKER_ENTRY_FILE_URL exported as:", WORKER_ENTRY_FILE_URL);

self.addEventListener?.(
  "message",
  function addOne(e) {
    var max = e.data;
    this.postMessage(e.data + 1);
  },
  false
);
