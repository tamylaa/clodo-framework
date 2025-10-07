export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '18'
        },
        modules: false  // Preserve ESM modules
      }
    ]
  ]
};