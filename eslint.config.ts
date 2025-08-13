import cspellPlugin from '@cspell/eslint-plugin';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import 'eslint-plugin-only-warn';
import perfectionist from 'eslint-plugin-perfectionist';
import tseslint from 'typescript-eslint';

export default tseslint.config({
    extends: [
        eslint.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        perfectionist.configs['recommended-natural'],
        eslintConfigPrettier,
    ],
    files: ['**/*.ts'],
    ignores: [
        '**/coverage/**',
        '**/assets/**',
        '**/docs/**',
        '**/data/**',
        '**/dist/**',
        '**/node_modules/**',
    ],
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
            project: 'tsconfig.json',
            projectService: true,
        },
    },
    plugins: { '@cspell': cspellPlugin },
    rules: {
        '@cspell/spellchecker': ['warn', {}],
        '@typescript-eslint/no-empty-object-type': 'off',
    },
});
