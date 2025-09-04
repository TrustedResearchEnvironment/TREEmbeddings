const path = require("path");

module.exports = {
  mode: "development",
  entry: {
    'custom-embedding': "./index.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: {
      type: "module",
    },
  },
  experiments: {
    outputModule: true,
  },
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
