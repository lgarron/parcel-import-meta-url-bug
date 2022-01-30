async function instantiateTrampoline() {
  const workerEntryFileURL = (await import("./worker.js"))
    .WORKER_ENTRY_FILE_URL;
  console.log({ workerEntryFileURL });

  const importSrc = `import "${workerEntryFileURL}";`;
  const blob = new Blob([importSrc], {
    type: "text/javascript",
  });
  const workerBlobURL = URL.createObjectURL(blob);
  console.log({ url: workerBlobURL });
  return new Worker(workerBlobURL, { type: "module" });
}

(async () => {
  const worker = await instantiateTrampoline();
  worker.addEventListener("message", (message) =>
    console.log("Received message:", 4)
  );
  // This should receive 4, which will be printed by the previous line.
  worker.postMessage(3);
})();
