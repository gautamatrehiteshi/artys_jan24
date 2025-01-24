const shim = require('fabric-shim');
const { Chaincode } = require('./src/chaincode');

shim.start(new Chaincode());
