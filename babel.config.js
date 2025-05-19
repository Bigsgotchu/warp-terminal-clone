module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
        esmodules: true
      },
      modules: 'auto'
    }],
    ['@babel/preset-react', {
      runtime: 'automatic'
    }]
  ],
  plugins: [
    // Transform dynamic imports for testing
    'babel-plugin-dynamic-import-node',
    // Support for class properties
    '@babel/plugin-proposal-class-properties',
    // Support for private methods
    '@babel/plugin-proposal-private-methods',
    // Support for optional chaining
    '@babel/plugin-proposal-optional-chaining'
  ],
  env: {
    test: {
      // Special settings for Jest environment
      plugins: [
        'babel-plugin-transform-import-meta',
        'babel-plugin-transform-react-jsx'
      ]
    }
  }
};

