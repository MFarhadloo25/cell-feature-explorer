/** Case-insensitive substring match; an empty query matches everything. */
export const matchesSearch = (text: string, query: string): boolean => {
    const q = query.trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
};

/** Adds every `available` value matching the query to `current` (all of them when the query is blank). */
export const selectMatching = (current: string[], available: string[], query: string): string[] => [
    ...current,
    ...available.filter((name) => matchesSearch(name, query) && !current.includes(name)),
];

/** Removes the values matching the query from `current` (everything when the query is blank). */
export const deselectMatching = (current: string[], query: string): string[] =>
    current.filter((name) => !matchesSearch(name, query));
