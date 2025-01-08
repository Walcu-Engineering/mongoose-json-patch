const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const json_patch_plugin = require('../../index');

class Customs extends mongoose.SchemaType {
  constructor(key, options){
    super(key, options, 'Mixed');
    this.path = key;
    console.log(this.path);
  }
  cast(val, full_document) {
    const path = this.path;
    if (!val) throw new Error('No value to cast');
    if (!full_document) throw new Error('No full document received');
    const casted_obj = val && Object.keys(val).length ? val : { a: 1 }
    return new Proxy(casted_obj, {
      set(obj, property, value){
        const document_relative_path = path.replace(full_document.$__fullPath() + '.', '');
        full_document.markModified(document_relative_path);
        full_document.markModified(document_relative_path + '.' + property);
        obj[property] = value;
        return true;
      },
    });
  }
}

mongoose.Schema.Types.Customs = Customs;
mongoose.Types.Customs = Customs;

const Series = new Schema({
  name: String,
  books: [
    {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
  customs: Customs,
}, {
});

Series.plugin(json_patch_plugin, {
  //blacklist rules, allow anything to be modified on the series
  rules: [],
  rules_mode: 'blacklist',
});



module.exports = new mongoose.model('Series', Series);

