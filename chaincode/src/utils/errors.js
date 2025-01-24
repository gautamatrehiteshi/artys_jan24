const ERRORS = {
  modelError: 'ModelError',
  modelTypeError: 'ModelTypeError',
  modelSubtypeError: 'ModelSubtypeError',
  alreadyExist: 'AlreadyExistsError',
  validationError: 'ValidationError',
  malformedSchema: 'MalformedSchemaError',
  malformedKey: 'MalformedKeyError',
  notFound: 'NotFoundError',
  unknownDataStorage: 'unknownDataStorageError'
};

class ModelError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.modelError;
  }
}
class ModelTypeError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.modelTypeError;
  }
}
class ModelSubtypeError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.modelSubtypeError;
  }
}
class ValidationError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.validationError;
  }
}
class AlreadyExistsError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.alreadyExist;
  }
}
class MalformedSchemaError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.malformedSchema;
  }
}
class MalformedKeyError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.malformedKey;
  }
}
class NotFoundError extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.notFound;
  }
}
class UnknownDataStorage extends Error {
  constructor (message) {
    super(message);
    this.name = ERRORS.unknownDataStorage;
  }
}

exports.ERRORS = ERRORS;

exports.ModelError = ModelError;
exports.ModelTypeError = ModelTypeError;
exports.ModelSubtypeError = ModelSubtypeError;
exports.ValidationError = ValidationError;
exports.AlreadyExistsError = AlreadyExistsError;
exports.MalformedSchemaError = MalformedSchemaError;
exports.MalformedKeyError = MalformedKeyError;
exports.NotFoundError = NotFoundError;
exports.UnknownDataStorage = UnknownDataStorage;
