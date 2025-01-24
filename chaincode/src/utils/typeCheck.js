const {
  ENUM_TYPE, REF_TYPE, ARRAY_TYPE, MAP_TYPE, CONCEPT_TYPE, STRING_TYPE,
  HIDDEN_PROPERTIES
} = require('./constants');
const {
  ERRORS, MalformedKeyError, ModelTypeError,
  ModelSubtypeError, NotFoundError, ValidationError, ModelError
} = require('./errors');
const { getAsset } = require('./io');

/** isCorrectType
* Evaluates the object structure, using its model schema.
* Used to validate objects and function arguments before executing any code.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {any} asset - data from payload
* @param {any} schema - model information to validate asset structure
* @param {any[]} linkedAssets [optional] - assets being created or updated in the same transaction
* @throws {ModelSubtypeError} - model definition error
*/
async function isCorrectType (stub, asset, schema, linkedAssets) {
  // check asset primary type
  checkNaturalType(asset, schema);
  // recursive checks for nested array and objects
  if (typeof asset === 'object') {
    await checkObjectType(stub, asset, schema, linkedAssets);
  } else if (schema.subtype) {
    // check non-nested subtypes
    switch (schema.subtype) {
      case ENUM_TYPE: {
        checkEnumType(stub.model, asset, schema);
        break;
      }
      case REF_TYPE: {
        await checkReferenceType(stub, asset, schema, linkedAssets);
        break;
      }
      default: {
        throw new ModelSubtypeError(`Unknown subtype: ${schema.subtype}`);
      }
    }
  }
}

/** checkNaturalType
* @param asset - data from payload
* @param schema - model information to validate asset structure
* @throws {ModelTypeError} Wrong asset natural JS type
*/
function checkNaturalType (asset, schema) {
  if (typeof asset !== schema.type) {
    throw new ModelTypeError(`Expecting ${JSON.stringify(asset)} to be of type ${schema.type}`);
  }
  return true;
}
/** checkEnumType
* @param model - model definition
* @param asset - data from payload
* @param schema - model information to validate asset structure
* @throws {ModelSubtypeError} - Unknown ENUM resource type
*/
function checkEnumType (model, asset, schema) {
  if (!model.enums[schema.resource]) {
    throw new ModelSubtypeError(`Unknown ENUM type: ${schema.resource}`);
  }
  if (!model.enums[schema.resource].has(asset)) {
    throw new ModelSubtypeError(`Unknown value for ${schema.resource}: ${asset}`);
  }
}
/** checkReferenceType
* @param {ChaincodeStub} stub - Blockchain stub
* @param {any} asset - data from payload
* @param {any} schema - model information to validate asset structure
* @param {any[]} linkedAssets [optional] - assets being created or updated in the same transaction
*/
async function checkReferenceType (stub, asset, schema, linkedAssets) {
  // TODO: Unit test this function (shouldn't be able to compile, there was some syntax error?)
  const keyDefinition = getKeyDefinition(stub.model, schema.resource);
  const key = initKey(stub, asset, keyDefinition, schema.resource);
  try {
    await getAsset(stub, key);
  } catch (e) {
    if (e.name !== ERRORS.notFound) {
      throw e;
    }
  }
  // asset referenced not found => check if its being created in the same transaction
  const refSchema = getSchema(stub.model, schema.resource);
  checkLinkedReference(asset, refSchema, linkedAssets);
}
/** checkLinkedReference
* @param asset - data from payload
* @param schema - model information to validate asset structure
* @param linkedAssets [optional] - assets being created or updated in the same transaction
* @throws {NotFoundError} Referenced asset does not exist
*/
function checkLinkedReference (asset, schema, linkedAssets) {
  // TODO REDO IT ALL ? Check entire keys instead of ids, docTypes
  // problems might arise for composite keys
  const linkedRef = linkedAssets.filter(
    linkedAsset => linkedAsset.id === asset && linkedAsset.docType === schema.title
  );
  if (linkedRef.length !== 1) {
    throw new NotFoundError(`Unknown ${schema.title} reference: ${asset}`);
  }
}

/** checkObjectType
* Evaluates a nested object structure, using its model schema.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {any} asset - data from payload
* @param {any} schema - model information to validate asset structure
* @param {any[]} linkedAssets [optional] - assets being created or updated in the same transaction
* @throws {ModelTypeError} Schema inconsistency
* @throws {ModelSubtypeError} Unknown or not found subtype property
*/
async function checkObjectType (stub, asset, schema, linkedAssets) {
  if (!schema.subtype) {
    await checkRegularObject(stub, asset, schema, linkedAssets);
  } else if (schema.subtype === ARRAY_TYPE && Array.isArray(asset)) {
    await checkArrayType(stub, asset, schema, linkedAssets);
  } else if (schema.subtype === MAP_TYPE && !Array.isArray(asset)) {
    await checkMapType(stub, asset, schema, linkedAssets);
  } else if (schema.subtype === CONCEPT_TYPE) {
    if (!('resource' in schema)) {
      throw new ModelError('CONCEPT construction schema error: missing resource property');
    }
    if (!stub.model.concepts[schema.resource]) {
      throw new ModelSubtypeError(`Unknown CONCEPT: ${schema.resource}`);
    }
    await isCorrectType(stub, asset, stub.model.concepts[schema.resource], linkedAssets);
  } else {
    throw new ModelSubtypeError(`Unknown subtype property: ${schema.subtype}`);
  }
}
/** checkArrayType
* Evaluates a nested array structure, using its model schema.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {any} asset - data from payload
* @param {any} schema - model information to validate asset structure
* @param {any[]} linkedAssets [optional] - assets being created or updated in the same transaction
*/
async function checkArrayType (stub, asset, schema, linkedAssets) {
  await asset.reduce(
    async (acc, item) => {
      const resolvedAcc = await acc;
      const childrenCorrectTypes = await isCorrectType(
        stub, item, schema.item, linkedAssets
      );
      return resolvedAcc && childrenCorrectTypes;
    },
    Promise.resolve(true)
  );
}
/** checkMapType
* Evaluates a nested Map structure, using its model schema.
* @param {ChaincodeStub} stub - Blockchain stub
* @param {any} asset - data from payload
* @param {any} schema - model information to validate asset structure
* @param {any[]} linkedAssets [optional] - assets being created or updated in the same transaction
* @throws {ModelTypeError} Map asset definition error
*/
async function checkMapType (stub, asset, schema, linkedAssets) {
  // check that each required property is present
  if (!schema.key) {
    throw (new ModelError('Missing schema property: key'));
  }
  if (!schema.value) {
    throw (new ModelError('Missing schema property: value'));
  }

  // check keys/values are of correct types
  await Promise.all(Object.entries(asset).map(
    async (entry) => {
      const keyCorrectType = isCorrectType(stub, entry[0], schema.key, linkedAssets);
      const valueCorrectType = isCorrectType(
        stub, entry[1], schema.value, linkedAssets
      );
      return Promise.all([keyCorrectType, valueCorrectType]);
    }
  ));
}
/** checkRegularObject
* Evaluates a nested object structure, using its model schema.
* @param {ChaincodeStub} stub - Blockchain stub
* @param asset - data from payload
* @param schema - model information to validate asset structure
* @param linkedAssets [optional] - assets being created or updated in the same transaction
* @throws Wrong asset type
* @throws Schema inconsistency
* @throws Unknown resource type
* @throws Referenced asset does not exist
* @throws Referenced ENUM resource does not exist
*/
async function checkRegularObject (stub, asset, schema, linkedAssets) {
  const assetKeys = new Set(Object.keys(asset));
  const schemaKeys = new Set(Object.keys(schema.properties));

  // check that each required property is present
  const requiredKeys = [...schemaKeys].filter(
    key => schema.properties[key].optional !== true
  );
  const missingRequiredKeys = requiredKeys.filter(x => !assetKeys.has(x));
  if (missingRequiredKeys.length > 0) {
    throw (new ValidationError(`Required property missing: ${missingRequiredKeys}`));
  }

  // check that no additional property is present
  const additionalProperties = [...assetKeys].filter(
    x => !schemaKeys.has(x) && !HIDDEN_PROPERTIES.has(x)
  );
  if (!schema.additionalProperties && additionalProperties.length > 0) {
    throw (new ValidationError(`Unexpected property: ${additionalProperties}`));
  }

  // check values are of correct types
  await Object.entries(asset).reduce(
    async (acc, entry) => {
      const resolvedAcc = await acc;
      if (HIDDEN_PROPERTIES.has(entry[0])) {
        return resolvedAcc;
      }
      const childrenCorrectTypes = await isCorrectType(
        stub, entry[1], schema.properties[entry[0]], linkedAssets
      );
      return resolvedAcc && childrenCorrectTypes;
    },
    Promise.resolve(true)
  );
}

function initKey (stub, assetData, keyDefinition, registry) {
  // each asset should contain a unique ID
  const idDefinition = { name: 'id', type: STRING_TYPE };
  const keyComponents = [...keyDefinition, idDefinition].map((elmt) => {
    if (!('name' in elmt)) {
      throw new ModelError(`Missing name property in Key definition for asset ${registry}`);
    }
    if (!(elmt.name in assetData)) {
      throw new MalformedKeyError(`Required property missing: ${elmt.name} in key`);
    }
    return assetData[elmt.name];
  });
  const key = stub.createCompositeKey(registry, keyComponents);
  return key;
}

function initPartialKey (stub, assetData, keyDefinition, registry) {
  // each asset should contain a unique ID
  const idDefinition = { name: 'id', type: STRING_TYPE };
  const fullKeyDefinition = [...keyDefinition, idDefinition];
  const keyComponents = [];
  for (let i = 0; i < fullKeyDefinition.length; i += 1) {
    const elmt = fullKeyDefinition[i];
    if (!('name' in elmt)) {
      throw new ModelError(`Missing name property in Key definition for asset ${registry}`);
    }
    if (!(elmt.name in assetData)) {
      break;
    }
    keyComponents.push(assetData[elmt.name]);
  }
  const key = stub.createCompositeKey(registry, keyComponents);
  return key;
}

function splitKey (stub, key) {
  const res = stub.splitCompositeKey(key);
  if (!((typeof res === 'object') && ('objectType' in res))) {
    throw new MalformedKeyError(`Unknown key: ${key}`);
  }
  return { registryId: res.objectType, keyProperties: res.attributes };
}

function getRegistry (model, registry) {
  if (!(registry in model.registries)) {
    throw new ModelError(`Unknown registry: ${registry}`);
  }
  return model.registries[registry];
}
function getKeyDefinition (model, registryId) {
  const registryModel = getRegistry(model, registryId);
  if (!('key' in registryModel)) {
    return [];
  }
  if (!Array.isArray(registryModel.key)) {
    throw new MalformedKeyError(`${registryId}'s key should be an array !`);
  }
  return registryModel.key;
}
function getSchema (model, registryId) {
  const registryModel = getRegistry(model, registryId);
  if (!('schema' in registryModel)) {
    throw new ModelError(`Registry model malformed (${registryId}): no schema property found.`);
  }
  return registryModel.schema;
}
function getDestination (model, registryId) {
  const registryModel = getRegistry(model, registryId);
  if (!('destination' in registryModel)) {
    throw new ModelError(`Registry model malformed (${registryId}): no destination property found.`);
  }
  return registryModel.destination;
}
function getDataCollection (model, registryId) {
  const registryModel = getRegistry(model, registryId);
  if (!('dataCollection' in registryModel)) {
    throw new ModelError(`Registry model malformed (${registryId}): no dataCollection property found.`);
  }
  return registryModel.dataCollection;
}

exports.isCorrectType = isCorrectType;
exports.getKeyDefinition = getKeyDefinition;
exports.getSchema = getSchema;
exports.getDestination = getDestination;
exports.getDataCollection = getDataCollection;
exports.initKey = initKey;
exports.initPartialKey = initPartialKey;
exports.splitKey = splitKey;

// only exported for testing purposes
exports.typeCheckTest = {
  checkNaturalType,
  checkEnumType,
  checkReferenceType,
  checkLinkedReference,
  checkObjectType,
  checkArrayType,
  checkMapType,
  checkRegularObject
};
