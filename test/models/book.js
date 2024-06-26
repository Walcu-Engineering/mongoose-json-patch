const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const json_patch_plugin = require('../../index');

const Book = new Schema({
  name: String,
  author: {
    type: Schema.Types.ObjectId,
    ref: "Author",
  },
  coauthor: {
    gets_credit: Boolean,
    author: {
      type: Schema.Types.ObjectId,
      ref: "Author",
    },
  },
  collaborators: [
    {
      gets_credit: Boolean,
      author: {
        type: Schema.Types.ObjectId,
        ref: "Author",
      },
    },
  ],
  reference_id: Schema.Types.ObjectId,
  publisher: String,
}, {

});

Book.plugin(json_patch_plugin, {
  //blacklist rules, don't allow publisher to be modified
  rules: [
    { path: "/publisher", op: ['add','replace','copy','move','remove','test'] },
  ],
  rules_mode: 'blacklist',
});

module.exports = new mongoose.model('Book', Book);
