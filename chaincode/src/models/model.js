const { concepts, enums } = require('./abstracts');
const { registries } = require('./registries');
const { transactions } = require('./transactions');
const { queries } = require('./queries');

exports.model = {
  registries,
  transactions,
  queries,
  concepts,
  enums
};
