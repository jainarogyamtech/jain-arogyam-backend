// User-supplied text reaches $regex in several routes — escape it so search
// input can't be interpreted as regex syntax.
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
