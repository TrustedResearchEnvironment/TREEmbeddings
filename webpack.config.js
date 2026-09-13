import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate build date and time
const buildDate = new Date().toISOString();

// Get git short hash for version footer
let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.warn('Warning: Could not retrieve git hash');
}

// Shared configuration
const commonConfig = {
  mode: "development", // Changed back to development to match original
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
  experiments: {
    outputModule: true, // Added back from original config
  },
  plugins: [
    // Add build date and time as a banner to the output file
    new webpack.BannerPlugin({
      banner: `Build Date: ${buildDate}`,
      entryOnly: true,
    }),
    // Inject git commit hash for version footer
    new webpack.DefinePlugin({
      __GIT_COMMIT_HASH__: JSON.stringify(gitHash),
    }),
  ],
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
        type: "module", // Changed back to module type from original
      },
    },
  },
  // TREEntityREDCap bundle
  {
    ...commonConfig,
    entry: "./index-entityredcap.ts",
    output: {
      filename: "TREEntityREDCap.js",
      path: path.resolve(__dirname, "dist"),
      library: {
        type: "module", // Changed back to module type from original
      },
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
        type: "module", // Changed back to module type from original
      },
    },
  },
];