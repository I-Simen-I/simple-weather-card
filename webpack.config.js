module.exports = {
  mode: 'production',
  entry: './src/simple-weather-card.ts',
  output: {
    filename: 'simple-weather-card.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192
          }
        }
      },
    ],
  },
};
