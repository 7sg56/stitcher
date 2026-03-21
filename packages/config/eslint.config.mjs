/** @type {import('eslint').Linter.Config} */
export default {
  // eslint.config.mjs is ESM, so use export default
  ignorePatterns: ["node_modules/", "dist/", ".next/"],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unused-vars": "off",
  },
};

