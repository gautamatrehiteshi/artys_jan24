/* eslint-disable import/no-unresolved */
const { ChaincodeStub } = require('fabric-shim');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiExclude = require('chai-exclude');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect } = require('chai');
/* eslint-enable import/no-unresolved */
const { REGISTRY } = require('../../../src/models/modelConstants');
const { ERRORS } = require('../../../src/utils/errors');
const {
  createAsset, createAll, readAsset, readAll,
  updateAsset, updateAll, deleteAsset, deleteAll
} = require('../../../src/utils/crud');
const { model } = require('./model');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiExclude);
chai.use(sinonChai);

describe('Unit test: generic CRUD operations', async () => {
  const ownerId = 'bob';
  const owner2 = 'joe';
  const amount = 1;
  const amount2 = 2;
  const id = 'token1';
  const id2 = 'token2';
  const id3 = 'duplicatedId';
  const key = 'key1';
  const key2 = 'key2';
  const key3 = 'duplicatedKey';

  let stub;
  beforeEach(() => {
    stub = sinon.createStubInstance(ChaincodeStub);
    stub.model = model;
  });

  describe('createAsset', async () => {
    beforeEach(() => {
      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns(
        { objectType: REGISTRY.token, attributes: [ownerId, id] }
      );

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id2]).returns(key2);
      stub.splitCompositeKey.withArgs(key2).returns(
        { objectType: REGISTRY.token, attributes: [ownerId, id2] }
      );

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id3]).returns(key3);
      stub.splitCompositeKey.withArgs(key3).returns(
        { objectType: REGISTRY.token, attributes: [ownerId, id3] }
      );
      stub.getState.withArgs(key3).returns(JSON.stringify({
        id: id3, ownerId, amount, docType: REGISTRY.token
      }));
    });

    it('Should not create asset without proper attributes', async () => {
      let res;
      try {
        res = await createAsset(stub, REGISTRY.token, { ownerId, id });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.validationError);
      expect(res.message).to.eql('Required property missing: amount');
    });
    it('Should not create asset without proper key attributes', async () => {
      let res;
      try {
        res = await createAsset(stub, REGISTRY.token, { amount, id });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql('Required property missing: ownerId in key');
    });
    it('Should create an Asset', async () => {
      const res = await createAsset(stub, REGISTRY.token, { ownerId, amount, id });
      expect(res).to.eql({
        ownerId, amount, id, docType: REGISTRY.token
      });
    });
    it('Should not create a duplicated Asset', async () => {
      let res;
      try {
        res = await createAsset(stub, REGISTRY.token, { ownerId, amount, id: id3 });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.alreadyExist);
      expect(res.message).to.eql(`Asset with key ${key3} already exists`);
    });
    it('Should not create multiple assets if there is an error', async () => {
      let res;
      try {
        res = await createAll(stub, REGISTRY.token, [{ ownerId, amount, id }, { amount, id: id2 }]);
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql('Required property missing: ownerId in key');
    });
    it('Should create multiple assets', async () => {
      let res;
      try {
        res = await createAll(
          stub,
          REGISTRY.token,
          [{ ownerId, amount, id }, { amount, ownerId, id: id2 }]
        );
      } catch (e) {
        res = e;
      }
      expect(res).to.eql([
        {
          ownerId, amount, id, docType: REGISTRY.token
        },
        {
          ownerId, amount, id: id2, docType: REGISTRY.token
        }
      ]);
    });
  });

  describe('readAsset', async () => {
    beforeEach(() => {
      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns(
        { objectType: REGISTRY.token, attributes: [ownerId, id] }
      );
      stub.getState.withArgs(key).returns(JSON.stringify({
        id, ownerId, amount, docType: REGISTRY.token
      }));

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId]).returns('partialKey');
      stub.splitCompositeKey.withArgs('partialKey').returns(
        { objectType: REGISTRY.token, attributes: [ownerId] }
      );
      stub.getStateByPartialCompositeKey.withArgs(REGISTRY.token, [ownerId]).returns(
        [
          {
            value: JSON.stringify({
              id, ownerId, amount, docType: REGISTRY.token
            })
          }
        ][Symbol.iterator]()
      );
    });

    it('Should not read assets with a missing key property', async () => {
      let res;
      try {
        res = await readAsset(stub, REGISTRY.token, { ownerId });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql('Required property missing: id in key');
    });

    it('Should read asset', async () => {
      let res;
      try {
        res = await readAsset(stub, REGISTRY.token, { ownerId, id });
      } catch (e) {
        res = e;
      }
      expect(res).to.eql({
        ownerId, amount, id, docType: REGISTRY.token
      });
    });

    it('Should read assets range with partial key', async () => {
      let res;
      try {
        res = await readAll(stub, REGISTRY.token, { ownerId });
      } catch (e) {
        res = e;
      }
      expect(res).to.eql([{
        ownerId, id, amount, docType: REGISTRY.token
      }]);
    });
  });

  describe('updateAsset', async () => {
    beforeEach(() => {
      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns({
        objectType: REGISTRY.token, attributes: [ownerId, id]
      });
      stub.getState.withArgs(key).returns(JSON.stringify({
        id, ownerId, amount, docType: REGISTRY.token
      }));

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id2]).returns(key2);
      stub.splitCompositeKey.withArgs(key2).returns({
        objectType: REGISTRY.token, attributes: [ownerId, id2]
      });

      stub.createCompositeKey.withArgs(REGISTRY.token, [owner2, id]).returns(key3);
      stub.splitCompositeKey.withArgs(key3).returns({
        objectType: REGISTRY.token, attributes: [owner2, id]
      });
      stub.getState.withArgs(key3).returns(JSON.stringify({
        id, ownerId: owner2, amount: amount2, docType: REGISTRY.token
      }));
    });

    it('Should not update assets with a missing key property', async () => {
      let res;
      try {
        res = await updateAsset(stub, REGISTRY.token, { ownerId, amount });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql('Required property missing: id in key');
    });

    it('Should not update a non existant asset', async () => {
      let res;
      try {
        res = await updateAsset(stub, REGISTRY.token, { ownerId, id: id2 });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.notFound);
      expect(res.message).to.eql(`No usable asset found with key: ${key2}`);
    });

    it('Should update asset', async () => {
      let res;
      try {
        res = await updateAsset(stub, REGISTRY.token, { ownerId, id, amount });
      } catch (e) {
        res = e;
      }
      expect(res).to.eql({
        ownerId, amount, id, docType: REGISTRY.token
      });
    });

    it('Should not update multiple assets if there is an error', async () => {
      let res;
      try {
        res = await updateAll(stub, REGISTRY.token, [{ ownerId, amount, id }, { amount, id: id2 }]);
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql(`Required property missing: ownerId in key`);
    });

    it('Should update multiple assets', async () => {
      let res;
      try {
        res = await updateAll(
          stub,
          REGISTRY.token,
          [{ ownerId, amount, id }, { amount: amount2, ownerId: owner2, id }]
        );
      } catch (e) {
        res = e;
      }
      expect(res).to.eql([
        {
          ownerId, amount, id, docType: REGISTRY.token
        },
        {
          ownerId: owner2, amount: amount2, id, docType: REGISTRY.token
        }
      ]);
    });
  });

  describe('deleteAsset', async () => {
    beforeEach(() => {
      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id]).returns(key);
      stub.splitCompositeKey.withArgs(key).returns({
        objectType: REGISTRY.token, attributes: [ownerId, id]
      });
      stub.getState.withArgs(key).returns(JSON.stringify({
        id, ownerId, amount, docType: REGISTRY.token
      }));

      stub.createCompositeKey.withArgs(REGISTRY.token, [ownerId, id2]).returns(key2);
      stub.splitCompositeKey.withArgs(key2).returns({
        objectType: REGISTRY.token, attributes: [ownerId, id2]
      });

      stub.createCompositeKey.withArgs(REGISTRY.token, [owner2, id]).returns(key3);
      stub.splitCompositeKey.withArgs(key3).returns({
        objectType: REGISTRY.token, attributes: [owner2, id]
      });
      stub.getState.withArgs(key3).returns(JSON.stringify({
        id, ownerId: owner2, amount: amount2, docType: REGISTRY.token
      }));
    });

    it('Should not delete an asset without a valid key', async () => {
      let res;
      try {
        res = await deleteAsset(stub, REGISTRY.token, { ownerId });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql(`Required property missing: id in key`);
    });

    it('Should not delete a non existant asset', async () => {
      let res;
      try {
        res = await deleteAsset(stub, REGISTRY.token, { ownerId, id: id2 });
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.notFound);
      expect(res.message).to.eql(`No usable asset found with key: ${key2}`);
    });

    it('Should delete a valid asset', async () => {
      let res;
      try {
        res = await deleteAsset(stub, REGISTRY.token, { ownerId, id });
      } catch (e) {
        res = e;
      }
      expect(res).to.eql({
        ownerId, amount, id, docType: REGISTRY.token
      });
    });

    it('Should not delete multiple assets if there is an error', async () => {
      let res;
      try {
        res = await deleteAll(stub, REGISTRY.token, [{ ownerId, id }, { id }]);
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.malformedKey);
      expect(res.message).to.eql(`Required property missing: ownerId in key`);
    });

    it('Should not delete multiple assets if there is an unknown asset', async () => {
      let res;
      try {
        res = await deleteAll(stub, REGISTRY.token, [{ ownerId, id }, { ownerId, id: id2 }]);
      } catch (e) {
        res = e;
      }
      expect(res.name).to.eql(ERRORS.notFound);
      expect(res.message).to.eql(`No usable asset found with key: ${key2}`);
    });

    it('Should delete multiple assets', async () => {
      let res;
      try {
        res = await deleteAll(stub, REGISTRY.token, [{ ownerId, id }, { ownerId: owner2, id }]);
      } catch (e) {
        res = e;
      }
      expect(res).to.eql([
        {
          ownerId, amount, id, docType: REGISTRY.token
        },
        {
          ownerId: owner2, amount: amount2, id, docType: REGISTRY.token
        }
      ]);
    });
  });
});
