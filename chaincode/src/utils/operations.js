const CRUD = require('./crud');
const { OPS } = require('./constants');

async function processOperations (stub, args) {
  // console.info('============= START : processOperations ===========');
  const operations = preprocessOperations(args);

  const linkedAssets = operations
    .filter(arg => arg.operation === OPS.create)
    .map((arg) => {
      const { registry, payload } = arg;
      const { schema } = stub.model.registries[registry];
      payload.docType = schema.title;
      return payload;
    });

  const transactions = await Promise.all(
    operations
      .map(async (arg) => {
        const { operation, registry, payload } = arg;
        if (operation === 'query') {
          // directly outputs, no write operation
          return payload;
        }

        const fcn = CRUD[operation];
        if (!fcn) {
          throw new Error(`Unknown CRUD operation: ${operation}`);
        }
        const result = await fcn(stub, registry, payload, linkedAssets);
        return result;
      })
      .map((promise, i) => promise.catch(
        (err) => {
          throw new Error(
            `Error on operation ${i}(${args[i].operation} ${args[i].registry} ${JSON.stringify(args[i].payload)}) :: ${err}`
          );
        }
      ))
  );
  // console.info('============= END : processOperations ===========');
  return transactions;
}

function preprocessOperations (operations) {
  const queries = operations.filter(op => op.operation === 'query');
  const opsDict = operations
    .filter(op => op.operation !== 'updateAsset' && op.registry)
    .reduce(
      (acc, op) => {
        const updatedAcc = { ...acc };
        updatedAcc[`${op.registry}::${op.payload.id}`] = { ...op, modified: false };
        return updatedAcc;
      },
      {}
    );

  operations
    .filter(op => op.operation === 'updateAsset')
    .forEach((op, index) => {
      // if we're trying to apply modifications to a future asset:
      if (`${op.registry}::${op.payload.id}` in opsDict) {
        if (opsDict[`${op.registry}::${op.payload.id}`].modified) {
          throw new Error(`Attempting to modify the asset ${op.registry}::${op.payload.id} multiple time.`);
        }
        // update the asset in place
        const { operation, registry, payload } = opsDict[`${op.registry}::${op.payload.id}`];
        opsDict[`${op.registry}::${op.payload.id}`] = {
          operation,
          registry,
          payload: {
            ...payload,
            ...op.payload
          },
          modified: true
        };
      } else {
        opsDict[`${op.registry}::${op.payload.id}`] = { ...op, modified: false };
      }
    });
  const updateOps = Object.values(opsDict).map(
    op => ({ operation: op.operation, registry: op.registry, payload: op.payload })
  );
  return [...queries, ...updateOps];
}

exports.processOperations = processOperations;
exports.preprocessOperations = preprocessOperations;
