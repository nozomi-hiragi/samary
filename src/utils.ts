const escapeRegExp = (s: string) =>
  s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");

export const ellipsis = (s: string | undefined, max: number): string => {
  if (!s) return s ?? "";
  s = s.trim();
  return s.length > max ? s.substring(0, max) + "..." : s;
};

export const trimTitle = (title: string, siteName?: string) => {
  title = title.trim();
  if (siteName) {
    siteName = escapeRegExp(siteName.trim());
    const separatorReg = "\\-\\|:・";
    const reg = new RegExp(`^(.+?)\\s?[${separatorReg}]\\s?${siteName}$`);
    const match = reg.exec(title)?.[1];
    if (match) return match;
  }
  return title;
};

export const absoluteURL = (path: string, base: string | URL) => {
  try {
    return new URL(path);
  } catch {
    return new URL(path, base);
  }
};
