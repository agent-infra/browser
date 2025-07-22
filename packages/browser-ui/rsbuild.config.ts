import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./examples/index.tsx",
    },
  },
  output: {
    distPath: {
      root: "./distExample",
    },
    minify: true,
    assetPrefix: "./",
  },
});
