// Required for any Expo/RN app to build (Metro/Babel transform pipeline) —
// not explicitly listed in the plan's files_modified but essential
// infrastructure without which the scaffold cannot bundle (Rule 2).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
