import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },
  {
    // 1.6.1 (DT-02): toda respuesta de la API pasa por handleResponse, que lanza el error en 4xx/5xx.
    files: ['src/api.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ReturnStatement > CallExpression[callee.object.name='res'][callee.property.name='json']",
          message: 'Usa handleResponse(res, mensaje): "return res.json()" no revisa res.ok y deja pasar los errores como datos.'
        }
      ]
    }
  }
);
