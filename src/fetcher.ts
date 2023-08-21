import { AfterResponseHook, cheerio, HTTPError, ky } from "./deps.ts";
import { StatusError } from "./status-error.ts";

const TIMEOUT = 20 * 1000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_UA = "Samary";

const splitSetCookies = (setCookie: string) => {
  const arr: string[] = [];
  setCookie.split(",").forEach((v) => {
    arr.push((/^ ?\S+=/.test(v) ? v : arr.pop() + v).trim());
  });
  return arr;
};

const execute = async (args: {
  url: string;
  method: "get" | "head";
  headers: Record<string, string | undefined>;
  typeFilter?: RegExp;
}) => {
  const maxSize = MAX_RESPONSE_SIZE;
  const controller = new AbortController();
  const { signal } = controller;

  const afterResponseHook: AfterResponseHook = (req, op, res) => {
    // Redirect
    if (res.status >= 300 && res.status < 400) {
      return ky(req, {
        ...op,
        headers: {
          ...op.headers,
          cookie: [
            new Headers(op.headers).get("cookie"),
            splitSetCookies(res.headers.get("set-cookie") ?? "")
              .map((v) => v.substring(v.indexOf(";"), -1)),
          ].flat().filter((v) => v).join("; "),
        },
      });
    }

    // Content type
    if (
      args.typeFilter &&
      !res.headers.get("content-type")?.match(args.typeFilter)
    ) {
      console.warn(res.headers.get("content-type"));
      controller.abort(
        `Rejected by type filter ${res.headers.get("content-type")}`,
      );
      return;
    }

    // Size
    const contentLength = res.headers.get("content-length");
    const size = contentLength !== null ? Number(contentLength) : 0;
    if (size > maxSize) {
      controller.abort(`maxSize exceeded (${size} > ${maxSize}) on response`);
    }
  };

  const req = ky(args.url, {
    method: args.method,
    headers: args.headers,
    timeout: TIMEOUT,
    signal,
    retry: {
      limit: 0,
    },
    cache: "no-cache",
    credentials: "include",
    redirect: "manual",
    hooks: { afterResponse: [afterResponseHook] },
    onDownloadProgress: (progress) => {
      if (progress.transferredBytes > maxSize && progress.percent !== 1) {
        controller.abort(
          `maxSize exceeded (${progress.transferredBytes} > ${maxSize}) on response`,
        );
      }
    },
  }).catch((e) => {
    if (e.name === "HTTPError") {
      const { response } = e as HTTPError;
      throw new StatusError(response);
    } else throw e;
  });

  return await req;
};

export const fetchDocument = async (
  url: string,
  opts?: { language?: string; userAgent?: string },
) => {
  const response = await execute({
    url,
    method: "get",
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": opts?.userAgent || DEFAULT_UA,
      "Accept-Language": opts?.language,
    },
    typeFilter: /^(text\/html|application\/xhtml\+xml)/,
  });

  const body = await response.text(); // TODO utf8以外が来たとき
  const $ = cheerio.load(body);

  return $;
};

export const get = (url: string) =>
  execute({ url, method: "get", headers: { "Accept": "*/*" } });

export const head = (url: string) =>
  execute({ url, method: "head", headers: { "Accept": "*/*" } });
