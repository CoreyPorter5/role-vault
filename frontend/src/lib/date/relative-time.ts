const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(value: Date | string | number, now: Date | number = new Date()): string {
    const date = value instanceof Date ? value : new Date(value);
    const nowMs = now instanceof Date ? now.getTime() : now;
    const elapsedMs = Math.max(0, nowMs - date.getTime());

    if (Number.isNaN(date.getTime())) {
        return "Time unavailable";
    }

    if (elapsedMs < HOUR_MS) {
        return "Just Now";
    }

    const hours = Math.floor(elapsedMs / HOUR_MS);
    if (hours < 24) {
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    const days = Math.floor(elapsedMs / DAY_MS);
    if (days < 7) {
        return `${days} ${days === 1 ? "day" : "days"} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (days < 30) {
        return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }

    const months = Math.floor(days / 30);
    if (days < 365) {
        return `${months} ${months === 1 ? "month" : "months"} ago`;
    }

    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
}
