export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '18'
        },
        modules: false, // Always keep ES modules - even for tests
        useBuiltIns: false
      }
    ]
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    '@babel/plugin-syntax-top-level-await'
  ]
};
