declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  // Minimal typing for runtime-side effect import.
  // The module sets `globalThis.pdfjsWorker.WorkerMessageHandler`.
  export const WorkerMessageHandler: unknown;
}

declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs" {
  // Minimal typing for runtime-side effect import.
  export const WorkerMessageHandler: unknown;
}

declare module "pdfjs-dist/legacy/build/pdf.min.mjs" {
  // Minimal typing for the pdfjs ESM bundle used at runtime.
  export const GlobalWorkerOptions: { workerSrc?: string };
  export const VerbosityLevel: { ERRORS: number };
  export function getDocument(args: unknown): {
    promise: Promise<{
      numPages: number;
      getPage(pageNum: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>;
        cleanup(): void;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}

