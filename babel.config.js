export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '18'
        },
        modules: false, // keep ES modules (Jest runs in ESM mode via babel-jest.useESM)
        useBuiltIns: false
      }
    ]
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    '@babel/plugin-syntax-top-level-await'
  ]
};
