export function truncateString(str: string, limit: number) {
    if (str.length <= limit) {
        return str;
    } else {
        return str.slice(0, limit) + "...";
    }
}
