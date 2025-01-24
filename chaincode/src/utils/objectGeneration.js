const { isCorrectType } = require('./typeCheck');
const { SUBTYPE } = require('./constants');
const { ERRORS, MalformedKeyError, ModelError } = require('./errors');

async function generateQuery(stub, query, args) {
    if (!args || args.length === 0) {
        return query;
    }
    // for each property in args, replace its key in the query
    let queryStr = JSON.stringify(query);
    Object.keys(args).forEach(
        arg => queryStr = queryStr.replace(`"{${arg}}"`, JSON.stringify(args[arg]))
    );
    return JSON.parse(queryStr);
}

function initObject(model, assetData, schema) {
    if (typeof assetData === 'object') {
        if (schema.subtype) {
            switch (schema.subtype) {
                case SUBTYPE.array:
                    return assetData.map(item => initObject(model, item, schema.item));
                case SUBTYPE.map:
                    return Object.entries(assetData).reduce((tmpAsset, entry) => {
                        const key = initObject(model, entry[0], schema.key);
                        const value = initObject(model, entry[1], schema.value);
                        const updatedAsset = { ...tmpAsset };
                        updatedAsset[key] = value;
                        return updatedAsset;
                    }, {});
                case SUBTYPE.concept:
                    if (!(schema && schema.resource)) {
                        throw new Error('Malconstructed CONCEPT schema: missing resource property');
                    }
                    if (!model.concepts[schema.resource]) {
                        throw new Error(`Unknown CONCEPT: ${schema.resource}`);
                    }
                    return initObject(model, assetData, model.concepts[schema.resource]);
                case SUBTYPE.ref:
                case SUBTYPE.enum:
                    break;
                default:
                    throw new Error(`Unknown subtype: ${schema.subtype}`);
            }
        }

        // recursive generation for nested objects
        // populating every property from the schema
        const asset = Object.keys(schema.properties).reduce((tmpAsset, property) => {
            const updatedAsset = { ...tmpAsset };
            if (assetData[property]) {
                // existing properties
                updatedAsset[property] = initObject(
                    model,
                    assetData[property],
                    schema.properties[property]
                );
            } else if (schema.properties[property].default) {
                // default values of empty properties
                updatedAsset[property] = schema.properties[property].default;
            }
            return updatedAsset;
        }, {});
        return asset;
    }

    // simple type, no recursion required
    return assetData;
}

function fuseObjects(source, newData) {
    // recursive generation for objects
    if (typeof source === 'object' && !Array.isArray(source)) {
        // populating every new data point
        const asset = Object.keys(newData).reduce((tmpAsset, property) => {
            // eslint-disable-next-line no-param-reassign
            tmpAsset[property] = fuseObjects(tmpAsset[property], newData[property]);
            return tmpAsset;
        }, source);
        return asset;
    }

    // simple type or array, no recursion required
    return newData;
}

exports.generateQuery = generateQuery;
exports.initObject = initObject;
exports.fuseObjects = fuseObjects;
