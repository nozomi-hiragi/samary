import { cheerio } from "./deps.ts";
import { get } from "./fetcher.ts";
import { Player } from "./samary.ts";
import { absoluteURL } from "./utils.ts";

type OEmbedJson = {
  version: "1.0";
  type: "photo" | "video" | "link" | "rich";
  html?: string;
  width?: number;
  height?: number;
};

export const getOEmbedPlayer = async (
  $: cheerio.CheerioAPI,
  pageUrl: string,
): Promise<Player | undefined> => {
  const href = $('link[type="application/json+oembed"]').attr("href");
  if (!href) return undefined;

  const oEmbedUrl = (() => {
    try {
      return absoluteURL(href, pageUrl);
    } catch {
      return undefined;
    }
  })();
  if (!oEmbedUrl) return undefined;

  const oEmbed = await get(oEmbedUrl.href).catch(() => undefined);
  if (!oEmbed) return undefined;

  const body: OEmbedJson | undefined = await (() => {
    try {
      return oEmbed.json();
    } catch {
      return undefined;
    }
  })();
  if (!body) return undefined;

  if (
    body.version !== "1.0" ||
    !["rich", "video"].includes(body.type)
  ) return undefined;

  if (
    !body.html ||
    !body.html.startsWith("<iframe ") || !body.html.endsWith("</iframe>")
  ) return undefined;

  const oEmbedHtml = cheerio.load(body.html);
  const iframe = oEmbedHtml("iframe");

  if (iframe.length !== 1) return undefined;
  if (iframe.parents().length !== 2) return undefined;

  const url = iframe.attr("src");
  if (!url) return undefined;

  try {
    if ((new URL(url)).protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }

  let width: number | undefined = Number(iframe.attr("width") || body.width);
  if (Number.isNaN(width)) width = undefined;

  const height = Math.min(Number(iframe.attr("height") || body.height), 1024);
  if (Number.isNaN(height)) return undefined;

  const safeList = [
    "autoplay",
    "clipboard-write",
    "fullscreen",
    "encrypted-media",
    "picture-in-picture",
    "web-share",
  ];
  const ignoredList = [
    "gyroscope",
    "accelerometer",
  ];
  const allow = (iframe.attr("allow") ?? "").split(/\s*;\s*/g)
    .filter((v) => v && !ignoredList.includes(v));
  if (iframe.attr("allowfullscreen") === "") {
    allow.push("fullscreen");
  }
  if (allow.some((allow) => !safeList.includes(allow))) {
    return undefined;
  }

  return { url, width, height, allow };
};
