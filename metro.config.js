const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
        const subpath = moduleName === 'zustand' ? 'index' : moduleName.replace('zustand/', '');
        const filePath = path.join(__dirname, 'node_modules', 'zustand', `${subpath}.js`);

        if (fs.existsSync(filePath)) {
            return { type: 'sourceFile', filePath };
        }
    }

    return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
