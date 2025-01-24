/* eslint-disable import/no-unresolved */
const { ChaincodeStub } = require('fabric-shim');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiExclude = require('chai-exclude');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect } = require('chai');
/* eslint-enable import/no-unresolved */

// const { REGISTRY } = require('../../../src/models/modelConstants');
// const { ERRORS } = require('../../../src/utils/errors');
const { TYPE } = require('../../../src/utils/constants');
const {
  isCorrectType, initKey, initPartialKey, splitKey, typeCheckTest
} = require('../../../src/utils/typeCheck');
const { model } = require('./model');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiExclude);
chai.use(sinonChai);

const {
  checkNaturalType, checkEnumType, checkReferenceType, checkLinkedReference,
  checkObjectType, checkArrayType, checkMapType, checkRegularObject
} = typeCheckTest;

const ownerId = 'bob';
const docType = 'token';
const id = 'item1';
const compositeKey1 = 'key1';
const compositeKey2 = 'key2';
const keyDefinition = [{ name: 'ownerId', type: TYPE.string }];

describe('Unit test: Object generation', async () => {
  let stub;
  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
    stub.newLogger = () => console;
  });

  describe('checkRegularObject', async () => {
    it('Should not throw for a valid object', async () => {
      const asset = { ownerId };
      const schema = { type: 'object', properties: { ownerId: { type: TYPE.string } } };
      const linkedAssets = [];
      try {
        await checkRegularObject(stub, asset, schema, linkedAssets);
      } catch (e) {
        expect(e).to.eql(true);
      }
    });
    it('Should not throw for a valid complexe object', async () => {
      const asset = { owner: { ownerId } };
      const schema = {
        type: 'object',
        properties: {
          owner: { type: 'object', properties: { ownerId: { type: TYPE.string } } }
        }
      };
      const linkedAssets = [];
      try {
        await checkRegularObject(stub, asset, schema, linkedAssets);
      } catch (e) {
        expect(e).to.eql(true);
      }
    });
    it('Should throw if an expected property is missing', async () => {
      const asset = { owner: { ownerId } };
      const schema = {
        type: 'object',
        properties: {
          owner: { type: 'object', properties: { ownerId: { type: TYPE.string } } }
        }
      };
      const linkedAssets = [];
      try {
        await checkRegularObject(stub, asset, schema, linkedAssets);
      } catch (e) {
        expect(e).to.eql(true);
      }
    });
  });
});

describe('Unit test: Key generation', async () => {
  let stub;
  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
    stub.newLogger = () => console;
    stub.createCompositeKey.withArgs(docType, [ownerId, id]).returns(compositeKey1);
    stub.createCompositeKey.withArgs(docType, [ownerId]).returns(compositeKey2);
  });

  describe('initKey', async () => {
    it('Should create a valid key', async () => {
      const assetData = { id, ownerId };
      const keyDef = keyDefinition;
      const registry = docType;
      const key = compositeKey1;
      expect(initKey(stub, assetData, keyDef, registry)).to.eql(key);
    });
  });

  describe('initPartialKey', async () => {
    it('Should create a partial key', async () => {
      const assetData = { ownerId };
      const keyDef = keyDefinition;
      const registry = docType;
      const key = compositeKey2;
      expect(initPartialKey(stub, assetData, keyDef, registry)).to.eql(key);
    });
  });
});
