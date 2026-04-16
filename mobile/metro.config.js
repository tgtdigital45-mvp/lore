const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");
const { resolve: metroResolve } = require("metro-resolver");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Permite importar `../shared` a partir de `mobile/` (código partilhado na raiz do repositório).
config.watchFolders = [monorepoRoot];

/**
 * Com `watchFolders` no monorepo, imports relativos `./src/...` a partir de
 * `react-native-toast-message/lib/index.js` podem resolver para a pasta `src/`
 * do repositório em vez de `node_modules/.../lib/src/`, quebrando o bundle.
 * Forçamos o caminho dentro do pacote quando o módulo de origem é esse index.
 */
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = String(context.originModulePath || "").replace(/\\/g, "/");
  if (moduleName.startsWith("./") && origin.endsWith("/react-native-toast-message/lib/index.js")) {
    const dir = path.dirname(context.originModulePath);
    const candidate = path.resolve(dir, moduleName);
    const suffixes = ["", ".js", ".jsx", ".ts", ".tsx"];
    for (const suf of suffixes) {
      const p = suf ? candidate + suf : candidate;
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return { type: "sourceFile", filePath: p };
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return metroResolve(context, moduleName, platform);
};

module.exports = config;
