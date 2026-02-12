const STORAGE_KEY = 'parkcheck_favorites';

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

export function toggleFavorite(slug: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    return true;
  }
}
