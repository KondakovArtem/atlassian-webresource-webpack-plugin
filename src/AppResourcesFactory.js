const AppResources = require('./AppResources');

class AppResourceFactory {
    constructor({ assetsUUID, assetNames, xmlDescriptorWebpackPath, options }) {
        this.assetsUUID = assetsUUID;
        this.assetNames = assetNames;
        this.xmlDescriptorWebpackPath = xmlDescriptorWebpackPath;
        this.options = options;
    }

    build(compiler, compilation) {
        const { assetsUUID, assetNames, xmlDescriptorWebpackPath, options } = this;
        return new AppResources({
            assetsUUID,
            assetNames,
            xmlDescriptorWebpackPath,
            options,
            compiler,
            compilation,
        });
    }
}

module.exports = AppResourceFactory;
