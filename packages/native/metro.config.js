const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Find the project and workspace roots
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 2. Watch all files in the monorepo (so changes in @audiobook/shared trigger a reload)
config.watchFolders = [workspaceRoot];

// 3. Force Metro to resolve modules from the workspace root node_modules
// This prevents "Duplicate Haste Map" errors and "Module not found"
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 4. Ensure Metro follows symlinks (important for npm/yarn/pnpm workspaces)
config.resolver.disableHierarchicalLookup = true;

module.exports = config
