/* eslint-disable import/no-unresolved */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = require('chai');
const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
/* eslint-enable import/no-unresolved */

const { REGISTRY } = require('../../src/models/modelConstants');

chai.should();
chai.use(chaiHttp);
chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.use(sinonChai);

function rdmInt (max = 999999999) {
  return Math.floor(Math.random() * max);
}
async function submitTransaction (query) {
  const res = await chai.request('api0.artys:4000')
    .post('/graphql')
    .set('Accept', 'application/json')
    .send({ query });
  return res;
}

function createTokensMutation (arg) {
  return `mutation { createTokens(${args2string(arg)}) }`;
}
function transferTokensMutation (arg) {
  return `mutation { transferTokens(${args2string(arg)}) }`;
}
function readTransferQuery (arg) {
  return `query { readAsset_transferDetails(${args2string(arg)}) { id, senderId, receiverId, amount, creationDate, utxos, stxos } }`;
}
// function readAllTokensQuery () {
//   return `query { readAll_utxo(docType: utxo) { id, ownerId, amount } }`;
// }
// function readTokensQuery (arg) {
//   return `query { readAsset_utxo(${args2string(arg)}) { id, ownerId, amount } }`;
// }
function queryWalletContentQuery (arg) {
  return `query { queryWalletContent(${args2string(arg)}) { records } }`;
}
function args2string (args) {
  return Object.keys(args).map(
    argKey => `\t${argKey}: ${JSON.stringify(args[argKey])}`
  ).join(',\n');
}

const runtime = rdmInt();
describe('Functional test: token lifecycle', () => {
  const receiverId = `receiver_${runtime}`;
  const senderId = `sender_${runtime}`;
  const amount = 35;
  const creationDate = `today_${runtime}`;
  const depositId = `deposit_${runtime}`;
  const transferId = `transfer_${runtime}`;

  describe('createTokens', async () => {
    it('Should not issue tokens if there are missing properties', async () => {
      const input = { ownerId: receiverId, depositId };
      const response = await submitTransaction(createTokensMutation(input));
      expect(response.status).to.not.eql(200);
      expect(response.body.errors[0].message).to.eql(
        `Field "createTokens" argument "amount" of type "Float!" is required,` +
        ` but it was not provided.`
      );
      // expect(response.body.message).to.eql(BlockchainErrorMessage +
      //     `Required property missing: amount`);
    });

    it('Should not issue tokens if properties are the wrong types', async () => {
      const input = {
        ownerId: amount, amount, depositId, creationDate
      };
      const response = await submitTransaction(createTokensMutation(input));
      expect(response.status).to.not.eql(200);
      expect(response.body.errors[0].message).to.eql(
        `String cannot represent a non string value: 35`
      );
      // expect(response.body.message).to.eql(BlockchainErrorMessage +
      //     `Expecting ${amount} to be of type string`);
    });

    it('Should create tokens', async () => {
      const input = {
        ownerId: senderId, amount, depositId, creationDate
      };
      const token = {
        id: depositId,
        docType: REGISTRY.token,
        ownerId: senderId,
        amount
      };
      const transferDetails = {
        id: depositId,
        docType: REGISTRY.transferDetails,
        receiverId: senderId,
        amount,
        creationDate,
        utxos: [depositId]
      };

      const response = await submitTransaction(createTokensMutation(input));
      expect(response.status).to.eql(200);
      const data = response.body.data.createTokens;
      expect(data.length).to.eql(2);
      expect(data).to.eql([token, transferDetails]);
    });
  });

  describe('transferTokens', async () => {
    it('Should not transfer tokens if there are missing properties', async () => {
      const input = {
        senderId, receiverId, transferId, creationDate
      };
      const response = await submitTransaction(transferTokensMutation(input));
      expect(response.status).to.not.eql(200);
      expect(response.body.errors[0].message).to.eql(
        `Field "transferTokens" argument "amount" of type "Float!" is required,` +
        ` but it was not provided.`
      );
    });

    it('Should not transfer tokens if there is a negative amount', async () => {
      const input = {
        senderId, receiverId, transferId, amount: -12, creationDate
      };
      const response = await submitTransaction(transferTokensMutation(input));
      // TODO: cracra: find better solution to detect error
      expect(response.body.errors.length).to.eql(1);
      // TODO: cracra: find better solution to retrieve error message
      // expect(response.body.errors[0].message).to.eql(
      //   'Amount of tokens transfered should be strictly positive.'
      // );
    });

    it('Should not transfer tokens if there aren\'t enough tokens', async () => {
      const amountAsked = 50;
      const input = {
        senderId, receiverId, transferId, amount: amountAsked, creationDate
      };
      const response = await submitTransaction(transferTokensMutation(input));
      expect(response.body.errors.length).to.eql(1);
      // expect(response.status).to.not.eql(200);
      // expect(response.body.message).to.eql(
      //   `${BlockchainErrorMessage}Cannot send ${amountAsked}. ${
      //    senderId} only has ${amount} tokens available.`
      // );
    });

    it('Should transfer tokens', async () => {
      const input = {
        senderId, receiverId, transferId, amount, creationDate
      };
      const res = await submitTransaction(transferTokensMutation(input));
      expect(res.status).to.eql(200);

      const transferDetailQuery = await submitTransaction(readTransferQuery({ id: transferId }));
      const td = transferDetailQuery.body.data.readAsset_transferDetails;
      expect(td.id).to.eql(transferId);
      expect(td.id).to.eql(transferId);
      expect(td.stxos).to.eql([depositId]);
      expect(td.utxos.length).to.eql(1);
    });
  });

  describe('queryTokens', async () => {
    // it('Should query tokens with readAll or custom query', async () => {
    //   const queryEndpoint = await submitTransaction(readTokensQuery({ ownerId: receiverId }));
    //   const readAllEndpoint = await submitTransaction(readAllTokensQuery());
    //   console.log(queryEndpoint.body)
    //   console.log(readAllEndpoint.body)
    //   expect(
    //     queryEndpoint.body.data.readAsset_transferDetails
    //   ).to.eql(
    //     readAllEndpoint.body.data.readAll_transferDetails
    //   );
    // });

    it('Should query correct token amount for receiver with custom query', async () => {
      const walletContent = await submitTransaction(
        queryWalletContentQuery({ ownerId: receiverId })
      );
      expect(walletContent.body.data.queryWalletContent.records.reduce(
        (acc, record) => (record.amount + acc),
        0
      )).to.eql(amount);
    });

    // it('Should query correct token amount for receiver with custom query', async () => {
    //   const readAllEndpoint = '/fabric/utxo/readAll/query';
    //   const queryInput = { ownerId: receiverId };
    //   const res = await submitTransaction(readAllEndpoint, queryInput);
    //   expect(
    //     res.body.reduce((acc, record) => (record.amount + acc), 0)
    //   ).to.eql(amount);
    // });

    it('Should query correct token amount for sender with custom query', async () => {
      const walletContent = await submitTransaction(
        queryWalletContentQuery({ ownerId: senderId })
      );
      expect(walletContent.body.data.queryWalletContent.records.reduce(
        (acc, record) => (record.amount + acc),
        0
      )).to.eql(0);
    });

    // it('Should query correct token amount for sender with custom query', async () => {
    //   const readAllEndpoint = '/fabric/utxo/readAll/query';
    //   const queryInput = { ownerId: senderId };
    //   const res = await submitTransaction(readAllEndpoint, queryInput);
    //   // const td = await submitTransaction(
    //   //   '/fabric/transferDetails/readAsset/query',
    //   //   { id: transferId }
    //   // );
    //   // console.log(td.body)
    //   expect(
    //     res.body.reduce((acc, record) => (record.amount + acc), 0)
    //   ).to.eql(0);
    // });
  });
});
