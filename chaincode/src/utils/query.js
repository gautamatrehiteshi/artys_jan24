const { generateQuery } = require('./objectGeneration');
const { splitKey } = require('./typeCheck');

async function queryLedger (stub, queryDefinition, args, bookmark, pageSize) {
  // const queryModel = stub.model.queries[queryName];
  // if (!queryModel) {
  //     throw new Error(`Unknown query: ${queryName}`);
  // }
  const query = await generateQuery(stub, queryDefinition.query, args);
  const results = await getQueryResultAsList(stub, query, bookmark, pageSize);
  // console.info('============= END : getAllDocuments ===========');
  return results;
}

async function customQuery (stub, query, bookmark, pageSize) {
  return getQueryResultAsList(stub, query, bookmark, pageSize);
}

async function queryWithPartialKey (stub, partialKey) {
  const { registryId, keyProperties } = splitKey(stub, partialKey);
  const keyIterator = await stub.getStateByPartialCompositeKey(registryId, keyProperties);
  const keys = iteratorToList(keyIterator);
  return keys;
}

/**
* Transform iterator to array of objects
*
* @param {'fabric-shim'.Iterators.CommonIterator} iterator
* @returns {Promise<Array>}
*/
async function iteratorToList (iterator) {
  const allResults = [];
  let res = null;
  while (res == null || !res.done) {
    res = await iterator.next();
    if (res.value && res.value.value.toString()) {
      try {
        allResults.push(JSON.parse(res.value.value.toString('utf8')));
      } catch (err) {
        allResults.push(res.value.value.toString('utf8'));
      }
    }
  }
  // empty try/catch for unit tests purposes.
  try {
    await iterator.close();
  } catch (e) {
    if (e.name !== 'TypeError' || e.message !== 'iterator.close is not a function') {
      throw e;
    }
  }

  return allResults;
}

async function getQueryResultAsList (stub, query, bookmark, pageSize = 50) {
  const queryString = JSON.stringify(query);
  const result = await stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
  const { iterator, metadata } = result;
  const records = await iteratorToList(iterator);
  return { records, ...metadata };
}

exports.queryLedger = queryLedger;
exports.customQuery = customQuery;
exports.queryWithPartialKey = queryWithPartialKey;

// only exported for testing purposes
exports.queryTest = {
  iteratorToList,
  getQueryResultAsList
};
