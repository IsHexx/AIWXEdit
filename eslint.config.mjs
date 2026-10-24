import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
    { ignores: ['main.js', '**/.gitkeep.ts', 'node_modules/**', 'assets/**', 'assets_backup/**', 'scripts/**', 'tests/**', '**/*.mjs'] },
    ...obsidianmd.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
        },
    },
];
