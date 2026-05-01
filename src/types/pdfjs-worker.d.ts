declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  // Minimal typing for runtime-side effect import.
  // The module sets `globalThis.pdfjsWorker.WorkerMessageHandler`.
  export const WorkerMessageHandler: unknown;
}

