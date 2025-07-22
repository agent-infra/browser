import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      react: ["./src/react/**"],
    },
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
    },
    {
      bundle: false,
      dts: true,
      format: "cjs",
    },
  ],
  output: {
    minify: true,
    distPath: {
      root: "./dist/react",
    },
    target: "web",
  },
  plugins: [pluginReact()],
});
