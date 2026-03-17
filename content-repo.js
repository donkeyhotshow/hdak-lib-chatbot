const DEFAULT_STARS_LIMIT = 100;

function parseStarsLimit(rawValue) {
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return DEFAULT_STARS_LIMIT;
  }
  return parsedValue;
}

export function getStarsLimitFromSettings(settings = {}) {
  if (typeof settings.starsLimit === "number" && settings.starsLimit >= 0) {
    return settings.starsLimit;
  }
  return parseStarsLimit(process.env.GITHUB_STARS_LIMIT);
}

export function applyStarsLimit(items, settings = {}) {
  const starsLimit = getStarsLimitFromSettings(settings);
  return items.filter(item => Number(item?.stars ?? 0) >= starsLimit);
}
