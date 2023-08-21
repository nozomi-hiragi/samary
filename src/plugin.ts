import { Samary } from "./samary.ts";

export interface Plugin {
  test: (url: URL) => boolean;
  summarize: (url: URL, language?: string) => Promise<Samary>;
}
