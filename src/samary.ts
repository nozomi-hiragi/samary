import general from "./picker.ts";
import { Plugin } from "./plugin.ts";

export type Samary = {
  siteName: string;
  title: string;
  description?: string;
  thumbnail?: string;
  icon?: string;
  sensitive?: boolean;
  activityPub?: string;
  player: Player;
};

export type Player = {
  url?: string;
  width?: number;
  height?: number;
  allow: string[];
};

type Result = Samary & {
  url: string;
};

export const samary = async (
  url: string,
  options?: {
    language?: string;
    plugins?: Plugin[];
  },
): Promise<Result> => {
  const urlInstance = new URL(url);

  const plugins = options?.plugins ?? [];
  const match = plugins.find((plugin) => plugin.test(urlInstance));

  return await (match ? match.summarize : general)(
    urlInstance,
    options?.language,
  ).then((res) => ({ ...res, url }));
};
