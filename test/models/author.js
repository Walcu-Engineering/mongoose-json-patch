const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const json_patch_plugin = require('../../index');

const Author = new Schema({
  first_name: String,
  last_name: String,
  publisher: String,
  email_address: {
    type: String,
    default: null,
  },
  best_sellers: [
    {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
  address: {
    city: String,
    state: String,
    zip: String,
    address_1: String,
    address_2: String,
  },
  phone_numbers: [String],
  aliases: {
    names: [String],
  },
  obj: {
    arr: [{
      obj: {
        field1: Number,
        field2: String,
        arr: [{
          field3: String,
        }],
      },
    }],
  },
});

Author.plugin(json_patch_plugin, {
  //blacklist rules, don't allow publisher to be modified
  rules: [
    { path: "/publisher", op: ['add','replace','copy','move','remove','test'] },
  ],
  rules_mode: 'blacklist',
});

module.exports = new mongoose.model('Author', Author);
