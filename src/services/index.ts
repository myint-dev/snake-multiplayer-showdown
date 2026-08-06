import { MockBackend } from "./mock-backend";
import type { BackendService } from "./types";

/**
 * The one and only backend entry point for the app.
 * Every component/route imports `backend` from here.
 */
export const backend: BackendService = new MockBackend();

export * from "./types";
export { MockBackend } from "./mock-backend";
