const {
  createAsset, readAsset, updateAsset, deleteAsset,
  createAll, readAll, updateAll, deleteAll
} = require('./crud');
const { queryLedger, customQuery } = require('./query');
const { processOperations } = require('./operations');
const { getTimestamp } = require('./time');

exports.createAsset = createAsset;
exports.readAsset = readAsset;
exports.updateAsset = updateAsset;
exports.deleteAsset = deleteAsset;

exports.createAll = createAll;
exports.readAll = readAll;
exports.updateAll = updateAll;
exports.deleteAll = deleteAll;

exports.queryLedger = queryLedger;
exports.customQuery = customQuery;

exports.processOperations = processOperations;

exports.getTimestamp = getTimestamp;
