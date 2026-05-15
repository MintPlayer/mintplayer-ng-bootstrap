// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Empty in dev so HttpClient hits a relative '/api/...' URL which the
  // ng-serve proxy (proxy.conf.json) forwards to localhost:5000.
  apiBase: '',
};
