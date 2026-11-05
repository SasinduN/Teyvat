/**
 * What a category says on the public site. The stored name stays: rows, URLs, the map
 * markers and the admin all use it, so only the label changes.
 */
export const categoryLabel = (category: string): string => (category === 'Hidden Gems' ? 'Off the path' : category);
