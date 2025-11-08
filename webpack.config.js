import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate build date and time
const buildDate = new Date().toISOString();

// Shared configuration
const commonConfig = {
  mode: "production",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};

export default [
  // TREEntityDB bundle
  {
    ...commonConfig,
    entry: "./index-entitydb.ts",
    output: {
      filename: "TREEntityDB.js",
      path: path.resolve(__dirname, "dist"),
      library: {
        name: "TREEntityDB",
        type: "umd",
        export: "default",
      },
      globalObject: "this",
    },
  },
  // TREEntityFolder bundle
  {
    ...commonConfig,
    entry: "./index-entityfolder.ts",
    output: {
      filename: "TREEntityFolder.js",
      path: path.resolve(__dirname, "dist"),
      library: {
        name: "TREEntityFolder",
        type: "umd",
        export: "default",
      },
      globalObject: "this",
    },
  },
];