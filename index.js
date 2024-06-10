const JSONPatchMongoose = require('./json_patch_mongoose');

/**
 * Plugin method def
 * @param {*} schema
 * @param {*} options
 */
async function plugin(schema, schema_level_options) {
  schema.methods.jsonPatch = function(patch, options) {
    const document = this;
    const patcher = new JSONPatchMongoose(schema, options || schema_level_options);
    patcher.apply(patch, document);
  }
}

module.exports = plugin;
