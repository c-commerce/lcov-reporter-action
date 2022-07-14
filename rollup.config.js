/* eslint-disable node/no-unpublished-import */
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

import json from '@rollup/plugin-json'
import externals from 'rollup-plugin-node-externals'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/main.cjs',
    format: 'cjs'
  },
  treeshake: true,
  plugins: [
    externals({
      builtin: true,
      deps: false
    }),
    nodeResolve({
      preferBuiltins: true,
      mainFields: ['main']
    }),
    commonjs({}),
    json()
  ]
}
