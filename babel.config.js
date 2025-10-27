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
    '@babel/plugin-syntax-import-meta',
    // Custom plugin to rewrite src/ paths during compilation
    function pathRewritePlugin() {
      return {
        visitor: {
          ImportDeclaration(path) {
            const source = path.node.source.value;
            // Rewrite imports from src/ to remove the src/ prefix
            // This accounts for src/ being compiled directly to dist/
            if (source.includes('/src/')) {
              path.node.source.value = source.replace(/\/src\//, '/');
            }
          }
        }
      };
    }
  ]
};
