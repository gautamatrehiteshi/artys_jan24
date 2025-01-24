const {
  ERRORS, NotFoundError, UnknownDataStorage
} = require('./errors');
const {
  isCorrectType, getDestination, getSchema, splitKey, getDataCollection
} = require('./typeCheck');

/** getAsset
* Any attempt at reading an asset on the Ledger should use this function.
* It resolves ledger_ids by hashing the asset id with its title (doctype)
* to enable unique Ids per registries.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} key - the object Id to retrieve
* @throws {NotFoundError}Asset not found
* @return {any} asset
*/
async function getAsset (stub, key) {
  const { registryId } = splitKey(stub, key);

  const assetAsBytes = await readBytes(stub, key, registryId);

  try {
    const asset = JSON.parse(assetAsBytes);
    return asset;
  } catch (e) {
    if (e.name === ERRORS.unknownDataStorage) {
      throw e;
    } else {
      throw new NotFoundError(`No usable asset found with key: ${key}`);
    }
  }
}
async function readBytes (stub, key, registryId) {
  const destination = getDestination(stub.model, registryId);
  switch (destination) {
    case 'private': {
      // retrieve private asset
      const bytes = await stub.getPrivateData(getDataCollection(stub.model, registryId), key);
      return bytes;
    }
    case 'state': {
      // retrieve regular asset
      return stub.getState(key);
    }
    default:
      throw new UnknownDataStorage(`Unknown registry destination: ${destination}`);
  }
}

/** setAsset
* Any attempt at writing an asset on the Ledger should use this function.
* It resolves ledger_ids by hashing the asset id with its title (doctype)
* to enable unique Ids per registries.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {string} registry - the asset registry.
* @param {any} asset - the asset object.
* @param {any[]} linkedAsset - Other assets being created or updated during the same transaction.
* @throws {UnknownDataStorage} - used to send detailed error message.
* @return {any} asset - the final asset written on the ledger.
*/
async function setAsset (stub, key, asset, linkedAssets) {
  const { registryId } = splitKey(stub, key);
  // validate asset structure
  const schema = getSchema(stub.model, registryId);
  await isCorrectType(stub, asset, schema, linkedAssets);
  // add doctype
  const completeAsset = { ...asset, docType: registryId };

  await writeBytes(stub, key, registryId, completeAsset);
  return completeAsset;
}
async function writeBytes (stub, key, registryId, asset) {
  const destination = getDestination(stub.model, registryId);
  switch (destination) {
    case 'private': {
      // store private asset
      return stub.putPrivateData(
        getDataCollection(registryId),
        key,
        Buffer.from(JSON.stringify(asset))
      );
    }
    case 'state': {
      // store regular asset
      return stub.putState(key, Buffer.from(JSON.stringify(asset)));
    }
    default: {
      throw new UnknownDataStorage(`Unknown registry's destination: ${destination}`);
    }
  }
}

exports.getAsset = getAsset;
exports.setAsset = setAsset;
