/** Shared page size for every paginated list. Kept out of pagination.tsx (a "use client" module — Next.js turns its exports into RSC reference proxies rather than plain values when imported into a server component). */
export const DEFAULT_PAGE_SIZE = 20;
