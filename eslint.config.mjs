import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Código conciso: una línea vacía como máximo, ninguna al inicio ni al final del
  // archivo, y sin espacios sobrantes al final de línea. Coincide con lo que produce
  // Prettier, así que ambos conviven sin pelearse.
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    rules: {
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
      "no-trailing-spaces": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El prototipo de referencia: código de terceros que no se edita ni se
    // publica, y que arrastra ReactDOM.render y otras cosas ya deprecadas.
    "references/**",
  ]),
]);

export default eslintConfig;
