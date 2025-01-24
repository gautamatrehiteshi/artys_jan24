const { TOKEN_STATUS } = require('./modelConstants');

/**
 * Concepts
 *
 * Concepts are similar to assets in their construction.
 * They cannot be instantiated or stored on the Blockchain individually.
 * They are mostly used to represent data structure that are part of regular assets.
 */
exports.concepts = {};

/**
 * Enums
 *
 * Enums are… well enums. You can define specific strings for type checking
 * to ensure the payload is conform to your expectations.
 */
exports.enums = {
  tokenStatus: new Set([...Object.values(TOKEN_STATUS)])
};
