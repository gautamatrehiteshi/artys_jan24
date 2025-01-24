/**
* Constants specific to the chaincode model
*
* Whenever possible, you should use constants instead of plain string.
* By centralising all your constants, you can quickly spot overlapping references/constants
* and updating existing constants values will not break any code.
*
* Add your own constants to this file and be sure to use them whenever possible.
*/

exports.REGISTRY = {
  token: 'utxo',
  spent_tokens: 'stxo',
  transferDetails: 'transferDetails'
};

exports.ENUM = {
  tokenStatus: 'tokenStatus'
};

exports.TOKEN_STATUS = {
  ok: 'OK',
  fwd: 'FORWARDED'
};
