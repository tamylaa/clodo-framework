export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '18'
        },
        modules: process.env.NODE_ENV === 'test' ? 'commonjs' : false
      }
    ]
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    process.env.NODE_ENV === 'test' ? 'babel-plugin-transform-import-meta' : null
  ].filter(Boolean)
};
