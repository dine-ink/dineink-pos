/// <reference types="vite/client" />

// @fontsource-variable/geist ships CSS with no type declarations, and
// TypeScript 6 rejects a side-effect import of an untyped module. Declaring it
// here keeps the font bundled with the app (rather than fetched from a CDN,
// which a frequently-offline till can't rely on) without loosening
// module resolution anywhere else.
declare module "@fontsource-variable/geist";
