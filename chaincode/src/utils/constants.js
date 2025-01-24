exports.OBJECT_TYPE = 'object';
exports.STRING_TYPE = 'string';
exports.NUMBER_TYPE = 'number';
exports.BOOLEAN_TYPE = 'boolean';

exports.ARRAY_TYPE = 'array';
exports.MAP_TYPE = 'map';

exports.ENUM_TYPE = 'enum';
exports.REF_TYPE = 'ref';
exports.CONCEPT_TYPE = 'concept';

exports.HIDDEN_PROPERTIES = new Set(['docType', 'lastModified']);

exports.TYPE = {
  object: 'object',
  string: 'string',
  number: 'number',
  bool: 'boolean'
};
exports.SUBTYPE = {
  array: 'array',
  map: 'map',
  enum: 'enum',
  ref: 'ref',
  concept: 'concept',
  registry: 'registry'
};
exports.OPS = {
  create: 'createAsset',
  read: 'readAsset',
  update: 'updateAsset',
  delete: 'deleteAsset'
};
