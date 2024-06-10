const js = require("@eslint/js");
const globals = require("globals");
const stylisticJs = require('@stylistic/eslint-plugin-js');
const mocha = require("eslint-plugin-mocha");

debugger;
module.exports = [
  js.configs.recommended,
  {
    plugins: {
      mocha,
      '@stylistic/js': stylisticJs,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      "require-atomic-updates": 0,
      "comma-dangle": ["error", {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "ignore",
      }],
      "prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "consistent-return": 0,
      "mocha/consistent-spacing-between-blocks": 0,
      "indent": ["error", 2],
      "no-debugger": 0,
      "no-console": 0,
      "key-spacing": 0,
      "quotes": 0,
      "new-cap": 0,
      "no-shadow": 0,
      "no-unused-vars": 1,
      "no-use-before-define": [2, "nofunc"],
      "keyword-spacing": ['warn', {}],
      '@stylistic/js/no-trailing-spaces': ['error', {}],
      '@stylistic/js/space-infix-ops': ['warn', {}],
      'object-curly-spacing': ['warn', 'always'],
    },
  },
];
