// import canPromise from "./can-promise";

export * from './browser';

// function checkParams(text, opts, cb) {
//   if (typeof text === 'undefined') {
//     throw new Error('String required as first argument')
//   }

//   if (typeof cb === 'undefined') {
//     cb = opts
//     opts = {}
//   }

//   if (typeof cb !== 'function') {
//     if (!canPromise()) {
//       throw new Error('Callback required as last argument')
//     } else {
//       opts = cb || {}
//       cb = null
//     }
//   }

//   return {
//     opts: opts,
//     cb: cb
//   }
// }
