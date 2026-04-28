/**
 * Side-effect imports for global stylesheets (`import '@/styles/foo.css'`).
 *
 * Next.js ships type declarations for `*.module.css` (CSS Modules) but not
 * for plain global stylesheets, so TS5.6+ trips TS2882 on the layout file.
 * One line of ambient typing fixes it.
 */
declare module '*.css';
