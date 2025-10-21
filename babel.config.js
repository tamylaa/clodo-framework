export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '18'
        },
        modules: false // Always output ESM, never CommonJS
      }
    ]
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta'
    // Removed conditional CommonJS plugin - pure ESM approach
  ]
};
