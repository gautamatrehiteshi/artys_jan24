/* eslint-disable import/no-unresolved */
const shim = require('fabric-shim');
/* eslint-enable import/no-unresolved */
const { model } = require('./models/model');
const transactions = require('./lib/_transactions');
const CRUD = require('./utils/_utils');
const {
  invokeQuery, invokeCustomQuery, invokeTransaction, invokeCrud, invokeCrudSurcharge
} = require('./utils/invoke');

const Chaincode = class {
  // Best practice is to have any Ledger initialization in separate function -- see initLedger()
  async Init (stub) {
    return shim.success(Buffer.from('=========== Instantiated chaincode ==========='));
  }

  // The Invoke method is called as a result of an application request to run the Smart Contract
  // The calling application program has also specified the particular smart contract
  // function to be called, with arguments
  async Invoke (stub) {
    if (!stub.model) {
      // eslint-disable-next-line no-param-reassign
      stub.model = model;
      // eslint-disable-next-line no-param-reassign
      stub.newLogger = functionName => shim.newLogger(functionName);
    }
    const ret = stub.getFunctionAndParameters();
    const args = extractParams(ret.params);
    // attempt to resolve it as a CRUD method
    if (CRUD[ret.fcn]) {
      const crudSurcharge = transactions[ret.fcn.replace('Asset', args.registryName)];
      if (crudSurcharge) {
        // We found a CRUD registry surcharge,
        // use user defined function instead of the regular CRUD methode
        return handleOutput(invokeCrudSurcharge(
          stub, args.registryName, args.payload, crudSurcharge
        ));
      }
      return handleOutput(invokeCrud(stub, args.registryName, args.payload, ret.fcn));
    }

    // attempt to resolve the invoked methode as a transaction
    const transaction = transactions[ret.fcn];
    const mutationDefinition = stub.model.transactions[ret.fcn];
    if (mutationDefinition && transaction) {
      return handleOutput(invokeTransaction(stub, args.payload, transaction, mutationDefinition));
    }

    // attempt to resolve the invoked method as a query
    const queryDefinition = stub.model.queries[ret.fcn];
    if (queryDefinition) {
      return handleOutput(invokeQuery(stub, args.payload, queryDefinition, args.bookmark));
    }

    // no generic method found, check custom functions
    switch (ret.fcn) {
      case 'query':
        return handleOutput(invokeCustomQuery(stub, args.payload, args.bookmark, args.pageSize));
      case 'modelDocumentation':
        return shim.success(Buffer.from(JSON.stringify({
          ...stub.model,
          enums: Object.keys(stub.model.enums).reduce(
            (acc, enumKey) => {
              acc[enumKey] = [...stub.model.enums[enumKey]];
              return acc;
            },
            {}
          )
        })));
      default:
        // no available method found
        return shim.error(`Received unknown function ${ret.fcn} invocation`);
    }
  }
};

function extractParams (arrayParams) {
  return {
    registryName: arrayParams[0],
    payload: JSON.parse(arrayParams[1]),
    bookmark: arrayParams[2],
    pageSize: arrayParams[3]
  };
}

async function handleOutput (promise) {
  const logger = shim.newLogger('handleOutput');
  try {
    const payload = await promise;
    return shim.success(Buffer.from(JSON.stringify(payload)));
  } catch (err) {
    logger.error(err);
    return shim.error(err.message);
  }
}

exports.Chaincode = Chaincode;
