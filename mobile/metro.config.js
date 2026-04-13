const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Permite importar `../shared` a partir de `mobile/` (código partilhado na raiz do repositório).
config.watchFolders = [monorepoRoot];

module.exports = config;
