export function truncateString(str: string, limit: number) {
  if (str.length <= limit) {
    return str;
  } else {
    const safeStr = String(str);
    return safeStr.slice(0, limit);
  }
}
