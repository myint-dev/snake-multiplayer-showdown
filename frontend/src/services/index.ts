import { RealBackend } from "./real-backend";
import type { BackendService } from "./types";

/**
 * The one and only backend entry point for the app.
 * Every component/route imports `backend` from here.
 */
export const backend: BackendService = new RealBackend();

export * from "./types";
export { RealBackend } from "./real-backend";
