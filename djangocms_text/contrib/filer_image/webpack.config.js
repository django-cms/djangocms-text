// Self-contained webpack config for the filer-image contrib.
//
// The source under ./src/ is split across ES modules so the package
// has something for webpack to do. The output is a single IIFE in
// static/, served alongside the main editor bundle and registered
// against the editor through `window.CMS_Editor.tiptap`.
//
// Note: there are no `@tiptap/*` imports in the source, so no externals
// configuration is needed — but we keep `externals` set explicitly to
// fail loudly if a future change accidentally imports tiptap. That's
// the whole point of the dynamic-extension contract: extensions must
// use the primitives handed to them by the host, never their own copy.

const path = require('path');

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
        path: path.resolve(__dirname, 'static/djangocms_text/tiptap_plugins'),
        filename: 'cms.filer_image.js',
        // IIFE so the bundle is a drop-in <script> like the
        // officepaste demo.
        iife: true,
    },
    // Tripwire: if a future change accidentally imports tiptap, webpack
    // will fail with "Module not found" instead of silently shipping a
    // duplicate copy of the editor.
    externals: {
        '@tiptap/core': 'commonjs2 @tiptap/core',
        '@tiptap/pm/state': 'commonjs2 @tiptap/pm/state',
        '@tiptap/pm/view': 'commonjs2 @tiptap/pm/view',
    },
    devtool: 'source-map',
    performance: { hints: false },
};
