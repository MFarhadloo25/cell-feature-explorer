/** Case-insensitive substring match; an empty query matches everything. */
export const matchesSearch = (text: string, query: string): boolean => {
    const q = query.trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
};
