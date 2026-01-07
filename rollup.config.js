import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const production = !process.env.ROLLUP_WATCH;

export default [
    // Main bundles (ESM, CJS, UMD)
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/honeydrop.esm.js',
                format: 'esm',
                sourcemap: true
            },
            {
                file: 'dist/honeydrop.cjs.js',
                format: 'cjs',
                sourcemap: true,
                exports: 'named'
            },
            {
                file: 'dist/honeydrop.umd.js',
                format: 'umd',
                name: 'Honeydrop',
                sourcemap: true,
                globals: {
                    'socket.io-client': 'io'
                }
            }
        ],
        external: ['socket.io-client'],
        plugins: [
            resolve({
                browser: true
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false
            }),
            production && terser()
        ]
    },
    // TypeScript declarations
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.d.ts',
            format: 'esm'
        },
        plugins: [dts()],
        external: ['socket.io-client']
    }
];
