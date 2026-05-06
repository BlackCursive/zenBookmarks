import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

const ctx = await esbuild.context({
  entryPoints: [
    'sidebar/sidebar.ts',
    'options/options.ts',
  ],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outdir: 'dist',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  minify: prod,
});

if (prod) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
}
