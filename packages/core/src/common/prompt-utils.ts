export function truncateString(str: string, limit: number = 2000) {
  if (str.length <= limit) {
    return str;
  } else {
    return str.slice(0, limit) + "...";
  }
}
