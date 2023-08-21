import { Samary } from "./samary.ts";

export interface Plugin {
  test: (url: URL) => boolean;
  // deno-lint-ignore no-explicit-any
  summarize: (url: URL, language?: string, options?: any) => Promise<Samary>;
}
