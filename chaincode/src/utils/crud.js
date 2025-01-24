const { setAsset, getAsset } = require('./io');
const {
  initKey, initPartialKey, getSchema, getKeyDefinition
} = require('./typeCheck');
const { initObject, fuseObjects } = require('./objectGeneration');
const { queryWithPartialKey } = require('./query');
const { ERRORS, AlreadyExistsError } = require('./errors');

/** createAsset
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} registryId - type of asset to create
* @param {any} payload - variable, based on models.json
* @param {any[]} linkedAssets - other assets being created in the same transaction
* @throws {AlreadyExistsError} key already exists
*/
async function createAsset (stub, registryId, payload, linkedAssets) {
  // retrieve asset and key definitions
  const keyDefinition = getKeyDefinition(stub.model, registryId);
  const schema = getSchema(stub.model, registryId);

  // init asset and key
  const key = initKey(stub, payload, keyDefinition, registryId);
  const asset = initObject(stub.model, payload, schema);

  // check that asset to create doesn't already exists
  try {
    await getAsset(stub, key);
    throw new AlreadyExistsError(`Asset with key ${key} already exists`);
  } catch (e) {
    if (e.name !== ERRORS.notFound) { throw e; }
  }
  // save asset
  const resolvedAsset = await setAsset(stub, key, asset, linkedAssets);
  return resolvedAsset;
}

/** readAsset
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} registryId - type of asset to create
* @param {any} payload - information to retrieve the asset
* @throws payload construction error
*/
async function readAsset (stub, registryId, payload) {
  const keyDefinition = getKeyDefinition(stub.model, registryId);
  const key = initKey(stub, payload, keyDefinition, registryId);
  const asset = await getAsset(stub, key);
  return asset;
}

/** updateAsset
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} registryId - type of asset to create
* @param payload - variable, based on models.json
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function updateAsset (stub, registryId, payload, linkedAssets) {
  // retrieve asset and key definitions
  const keyDefinition = getKeyDefinition(stub.model, registryId);
  const schema = getSchema(stub.model, registryId);

  // init asset and key
  const key = initKey(stub, payload, keyDefinition, registryId);

  // check that asset to update exists
  const retrievedAsset = await getAsset(stub, key);
  const fusedAsset = fuseObjects(retrievedAsset, payload);
  const asset = initObject(stub.model, fusedAsset, schema);

  // save asset
  const resolvedAsset = await setAsset(stub, key, asset, linkedAssets);
  return resolvedAsset;
}

/** deleteAsset
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} registryId - type of asset to create
* @param payload - variable, based on models.json
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function deleteAsset (stub, registryId, payload) {
  const keyDefinition = getKeyDefinition(stub.model, registryId);
  const key = initKey(stub, payload, keyDefinition, registryId);
  // check that asset to delete exists
  const asset = await getAsset(stub, key);
  await stub.deleteState(key);
  return asset;
}

/** createAll
* @param assetType - type of asset to update
* @param assetIds - list of assets to update
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function createAll (stub, registry, payload) {
  // wait for all to resolve
  const transactions = await Promise.all(
    payload.map(assetId => createAsset(stub, registry, assetId))
  );
  return transactions;
}

/** readAll
* @param assetType - type of asset to update
* @param assetIds - list of assets to update
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function readAll (stub, registryId, payload) {
  // create partial key
  const keyDefinition = getKeyDefinition(stub.model, registryId);
  const partialKey = initPartialKey(stub, payload, keyDefinition, registryId);
  // query results from partial key
  const assets = await queryWithPartialKey(stub, partialKey);
  return assets;
}

/** updateAll
* @param assetType - type of asset to update
* @param assetIds - list of assets to update
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function updateAll (stub, registry, payload) {
  // wait for all to resolve
  const transactions = await Promise.all(
    payload.map(assetId => updateAsset(stub, registry, assetId))
  );
  return transactions;
}

/** deleteAll
* @param assetType - type of asset to delete
* @param assetIds - list of assets to delete
* @return errorByte - response Bit as specified in ERC-1066
* @return errorMsg [optional] - error message data for more context
*/
async function deleteAll (stub, registry, payload) {
  // wait for all to resolve
  const transactions = await Promise.all(
    payload.map(assetId => deleteAsset(stub, registry, assetId))
  );
  return transactions;
}

exports.createAsset = createAsset;
exports.readAsset = readAsset;
exports.updateAsset = updateAsset;
exports.deleteAsset = deleteAsset;

exports.createAll = createAll;
exports.readAll = readAll;
exports.updateAll = updateAll;
exports.deleteAll = deleteAll;
