const _ = require("lodash");
const path = require("path");
const Finder = require("fs-finder");
const SourceUtils = require("./source-utils");

function getEntryPointsFromDir(dir) {
    return Finder.from(dir)
        .filter((stat, path) => _.includes(path, "/context/"))
        .findFiles()
        .map((file) => {
            const jsExt = /\.js$/;
            const context = path.basename(file).replace(jsExt, "");
            const module = file.replace(`${dir}/`, "").replace(jsExt, "");
            return [context, module]
        });
}

module.exports = {
    getEntryPoints(sourceUtils) {
        const entryPoints = {};
        if (sourceUtils instanceof SourceUtils) {
            const resourceDirectories = sourceUtils.getResourceDirectories();
            _.flatten(resourceDirectories.map(getEntryPointsFromDir))
                .forEach((entryPoint) => {
                    const context = entryPoint[0];
                    const module = entryPoint[1];
                    entryPoints[context] = entryPoints[context] || [];
                    entryPoints[context].push(module);
                });
        }
        return entryPoints;
    },
    writeDevServerJsLink(devServerRoot, file) {
        return `<script src="${devServerRoot}/${file}" /></script>`;
    },
    writeDevServerCssLink(devServerRoot, file) {
        return `<link rel="stylesheet" href="${devServerRoot}/${file}" />`
    },
    writeDevServerLink(devServerRoot, file) {
        if (!devServerRoot) {
            return `
                throw new Error("
                    Cannot retrieve resource from webpack dev server as you have not specified a devServerUrl in
                    the webpack-conf file. 
                ")`
        }
        if (/\.js$/.test(file)) {
            return `document.write('${this.writeDevServerJsLink(devServerRoot, file)}');`;
        }
        if (/\.css/.test(file)) {
            return `document.write('${this.writeDevServerCssLink(devServerRoot, file)}');`;
        }
    }
};
