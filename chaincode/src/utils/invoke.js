const { isCorrectType } = require('./typeCheck');
const { initObject } = require('./objectGeneration');
const { processOperations } = require('./operations');
const { queryLedger, customQuery } = require('./query');
const CRUD = require('./crud');

async function invokeQuery (stub, params, qryDefinition, bookmark, pageSize) {
  const logger = stub.newLogger('invokeQuery');
  const arg = initObject(stub.model, params, qryDefinition.input);
  logger.info(`Querying with ${JSON.stringify(arg)}`);
  await isCorrectType(stub, arg, qryDefinition.input);

  const payload = await queryLedger(stub, qryDefinition, arg, bookmark, pageSize);
  return payload;
}
async function invokeCustomQuery (stub, query, bookmark, pageSize) {
  const payload = await customQuery(stub, query, bookmark, pageSize);
  return payload;
}

async function invokeTransaction (stub, params, transaction, mutationDefinition) {
  const arg = initObject(stub.model, params, mutationDefinition.input);
  await isCorrectType(stub, arg, mutationDefinition.input);
  const operations = await transaction(stub, arg);
  const payload = await processOperations(stub, operations);
  return payload;
}

async function invokeCrud (stub, registry, params, methodName) {
  const method = CRUD[methodName];
  // special case for processOperations
  if (methodName === 'processOperations') {
    if (params.length !== 1) {
      const errorMsg = `Incorrect number of arguments. Expecting [{operation, registry, payload}], received ${params}.`;
      throw new Error(errorMsg);
      // return shim.success(Buffer.from(errorMsg));
    }
    const payload = await method(stub, params);
    return payload;
  }
  const payload = await method(stub, registry, params);
  return payload;
}

async function invokeCrudSurcharge (stub, registry, params, surchageMethod) {
  const operations = await surchageMethod(
    stub,
    params,
    registry
  );
  const payload = await processOperations(stub, operations, stub.model);
  return payload;
}

exports.invokeQuery = invokeQuery;
exports.invokeCustomQuery = invokeCustomQuery;
exports.invokeTransaction = invokeTransaction;
exports.invokeCrud = invokeCrud;
exports.invokeCrudSurcharge = invokeCrudSurcharge;
