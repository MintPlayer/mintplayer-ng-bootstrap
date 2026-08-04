export default {
  root: import.meta.dirname,
  build: {
    outDir: 'out-vite',
    emptyOutDir: true,
    target: 'es2022',
    reportCompressedSize: true,
    rollupOptions: {
      input: { app: 'app.mjs' },
      preserveEntrySignatures: 'exports-only',
      output: { format: 'es' },
    },
  },
};
