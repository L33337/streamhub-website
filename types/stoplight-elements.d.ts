// Minimal type declaration for `@stoplight/elements`.
//
// The package ships full TypeScript definitions at
// `node_modules/@stoplight/elements/index.d.ts`, but its package.json
// `exports` field doesn't surface them, so the bundler-mode resolver in
// our tsconfig cannot find them. We declare just enough surface to type
// the `<API>` component we render inside ApiReference.tsx.
//
// Upgrade path: once @stoplight/elements exposes types via `exports`,
// delete this file.

declare module '@stoplight/elements' {
  import type { ComponentType } from 'react';

  export interface APIProps {
    apiDescriptionUrl: string;
    apiDescriptionDocument?: string | object;
    layout?: 'stacked' | 'sidebar';
    router?: 'hash' | 'memory' | 'history' | 'browser' | 'static';
    basePath?: string;
    hideSchemas?: boolean;
    hideInternal?: boolean;
    hideExport?: boolean;
    hideTryIt?: boolean;
    tryItCredentialsPolicy?: 'omit' | 'include' | 'same-origin';
    tryItCorsProxy?: string;
    logo?: string;
  }

  export const API: ComponentType<APIProps>;
}

declare module '@stoplight/elements/styles.min.css';
