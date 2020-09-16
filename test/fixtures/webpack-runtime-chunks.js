const asyncChunkLoader = pluginKey =>
    `
/******/ 		if(installedChunks[chunkId] === 0) { // 0 means "already installed".
/******/ 		    return Promise.resolve();
/******/ 		}
/******/ 		if (installedChunks[chunkId]) {
/******/ 		    return installedChunks[chunkId][2];
/******/ 		}
/******/ 		promises.push(
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        installedChunks[chunkId] = [resolve, reject];
/******/ 		    }),
/******/ 		    new Promise(function(resolve, reject) {
/******/ 		        WRM.require('wrc!${pluginKey}:' + chunkId).then(resolve, reject);
/******/ 		    })
/******/ 		);
/******/ 		return installedChunks[chunkId][2] = Promise.all(promises);`.trim();

module.exports = {
    asyncChunkLoader,
};
