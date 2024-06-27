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
  address: new mongoose.Schema({
    city: String,
    state: String,
    zip: String,
    address_1: String,
    address_2: String,
  }),
  phone_numbers: [String],
  aliases: new mongoose.Schema({
    names: [String],
  }),
  double_nested_array: [[String]],
  triple_nested_array: [[[String]]],
  super_nested: {
    type: new mongoose.Schema({
      arr: [new mongoose.Schema({
        obj: new mongoose.Schema({
          field1: Number,
          field2: String,
          nested_arr: [new mongoose.Schema({
            field3: String,
          })],
        }),
      })],
    })
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
