// Import this module only from server components, route handlers and composition roots.
import "server-only";
import { parseEnv } from "./env";

export const env = parseEnv(process.env);
