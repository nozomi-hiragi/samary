import { cheerio, unescapeHtml } from "./deps.ts";
import { absoluteURL, ellipsis, trimTitle } from "./utils.ts";
import { fetchDocument, head } from "./fetcher.ts";
import type { Player, Samary } from "./samary.ts";
import { getOEmbedPlayer } from "./oEmbed.ts";

const pickSiteName = ($: cheerio.CheerioAPI) => {
  const siteName = $('meta[property="og:site_name"]').attr("content") ||
    $('meta[name="application-name"]').attr("content");
  return siteName ? unescapeHtml(siteName) : undefined;
};

const pickTitle = ($: cheerio.CheerioAPI) =>
  ellipsis(
    unescapeHtml(
      $('meta[property="og:title"]').attr("content") ||
        $('meta[property="twitter:title"]').attr("content") ||
        $("title").text(),
    ),
    100,
  );

const pickDescription = ($: cheerio.CheerioAPI) => {
  const description = $('meta[property="og:description"]').attr("content") ||
    $('meta[property="twitter:description"]').attr("content") ||
    $('meta[name="description"]').attr("content");
  return description ? ellipsis(unescapeHtml(description), 300) : undefined;
};

const pickImage = ($: cheerio.CheerioAPI) => {
  return $('meta[property="og:image"]').attr("content") ||
    $('meta[property="twitter:image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") ||
    $('link[rel="apple-touch-icon"]').attr("href") ||
    $('link[rel="apple-touch-icon image_src"]').attr("href");
};

const pickIcon = ($: cheerio.CheerioAPI) => {
  return $('link[rel="shortcut icon"]').attr("href") ||
    $('link[rel="icon"]').attr("href") ||
    "/favicon.ico";
};

const pickPlayer = ($: cheerio.CheerioAPI): Player => {
  const url = ($('meta[property="twitter:card"]').attr("content") !==
      "summary_large_image" && (
      $('meta[property="twitter:player"]').attr("content") ||
      $('meta[name="twitter:player"]').attr("content")
    )) ||
    $('meta[property="og:video"]').attr("content") ||
    $('meta[property="og:video:secure_url"]').attr("content") ||
    $('meta[property="og:video:url"]').attr("content");

  const width = parseInt(
    $('meta[property="twitter:player:width"]').attr("content") ||
      $('meta[name="twitter:player:width"]').attr("content") ||
      $('meta[property="og:video:width"]').attr("content") ||
      "",
  );

  const height = parseInt(
    $('meta[property="twitter:player:height"]').attr("content") ||
      $('meta[name="twitter:player:height"]').attr("content") ||
      $('meta[property="og:video:height"]').attr("content") ||
      "",
  );

  return {
    url,
    width: Number.isNaN(width) ? undefined : width,
    height: Number.isNaN(height) ? undefined : height,
    allow: url ? ["autoplay", "encrypted-media", "fullscreen"] : [],
  };
};

const pickSensitive = ($: cheerio.CheerioAPI) =>
  $(".tweet").attr("data-possibly-sensitive") === "true";

const pickActivityPub = ($: cheerio.CheerioAPI) =>
  $('link[rel="alternate"][type="application/activity+json"]').attr("href");

const pickupSamary = async (
  url: URL,
  language?: string,
  options?: { userAgent?: string },
): Promise<Samary> => {
  if (
    language &&
    !/^(([a-zA-Z]{2}|\*)(-[a-zA-Z]{2})?(;q\=\d.\d)?(\s?,\s?)?)+$/.test(language)
  ) language = undefined;

  const $ = await fetchDocument(url.href, {
    language,
    userAgent: options?.userAgent,
  });

  const siteName = pickSiteName($) || url.hostname;
  const title = trimTitle(pickTitle($), siteName) || siteName;
  const description = (() => {
    const description = pickDescription($);
    return description === title ? undefined : description;
  })();
  const image = pickImage($);
  const thumbnail = image ? absoluteURL(image, url.href).href : undefined;
  const sensitive = pickSensitive($);
  const activityPub = pickActivityPub($);

  const checkURL = async (path: string) => {
    const target = absoluteURL(path, url.href);
    try {
      await head(target.href);
      return target;
    } catch {
      return undefined;
    }
  };

  const [icon, player] = await Promise.all([
    checkURL(pickIcon($)).then((url) => url?.href),
    getOEmbedPlayer($, url.href).then((oEmbed) => oEmbed ?? pickPlayer($)),
  ]);

  return {
    siteName,
    title,
    description,
    thumbnail,
    sensitive,
    activityPub,
    icon,
    player,
  };
};

export default pickupSamary;
