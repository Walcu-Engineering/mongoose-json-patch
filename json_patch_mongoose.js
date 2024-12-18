/*
 *   Copyright (c) 2020 Ratio Software, LLC
 *   All rights reserved.
 *   @author Clayton Gulick <clay@ratiosoftware.com>
 */
const assert = require('assert');
const patch_schema = require('./schema.json');
const JSONPatchRules = require('json-patch-rules');
const Ajv = require('ajv');

const ajv = new Ajv();
const validate = ajv.compile(patch_schema); //run sync at startup time

/**
 * Utility class for applying a RFC6902 compliant json-patch transformation to a mongoose model.
 */
class JSONPatchMongoose {
  constructor(schema, options) {
    this.schema = schema;
    this.options = Object.assign({
      autosave: false,
    }, options);
    if (this.options.rules)
      this.patch_rules = new JSONPatchRules(this.options.rules, { mode: this.options.rules_mode });
    this.save_queue = [];
  }

  /**
     * Verify that the patch documents meets the RFC schema
     * @param {*} patch
     */
  validate(patch) {
    const valid = validate(patch);
    if (!valid)
      this.errors = validate.errors;
    return valid;
  }

  /**
     * Apply a patch to a mongoose document, optionally with a set of rules that specify allowed fields.
     * @param {*} patch
     * @param {*} document
     * @param {*} rules
     */
  apply(patch, document) {
    //first, verify the patch is a valid RFC6902 json-patch document
    if (!this.validate(patch))
      throw new Error(JSON.stringify(this.errors));

    //next, make sure it passes all rules
    if (this.patch_rules)
      if (!this.patch_rules.check(patch))
        throw new Error("Patch failed rule check");

    this.schema = document.schema;
    this.save_queue = [document];
    this.document = document;
    for (const item of patch) {
      const { op } = item;
      this[op](item);
    }
  }

  remove(item) {
    let { path } = item;
    //if the path is an array, remove the element, otherwise set to undefined
    path = this.jsonPointerToMongoosePath(path);
    const current_value = this.document.get(path);
    const parent = this.walkPath(path, -1);
    if (Array.isArray(parent))
      return parent.pull(current_value);
    this.setPath(path, undefined);
  }

  add(item) {
    const { value } = item;
    const path = this.jsonPointerToMongoosePath(item.path);
    const parts = path.split('.');
    let part = parts[parts.length - 1];
    const parent = this.walkPath(path, -1);
    // this should always be true
    if (Array.isArray(parent)) {
      if (part == '-') {
        return parent.push(value);
      }
      else {
        try {
          part = parseInt(part);
          if (part > parent.length)
            throw new Error();
          //this calls mongoose splice, which has proper change tracking
          //rfc6902 says we don't spread array values, we just add an array element
          parent.splice(part, 0, value);
        }
        catch (err) {
          throw new Error("Invalid index value: " + part + " for array add", err);
        }
      }
    }
    else
      this.setPath(path, value);
  }

  replace(item) {
    // From RFC 6902:
    // This operation is functionally identical to a "remove" operation for
    // a value, followed immediately by an "add" operation at the same
    // location with the replacement value.
    const { path, value } = item;
    this.remove({ path });
    this.add({ path, value });
  }

  copy(item) {
    // From RFC 6902:
    // This operation is functionally identical to an "add" operation at the
    // target location using the value specified in the "from" member.
    const { from, path } = item;
    const mongoose_from = this.jsonPointerToMongoosePath(from);
    const value = this.document.get(mongoose_from);
    this.add({ path, value });
  }

  move(item) {
    // From RFC 6902:
    // This operation is functionally identical to a "remove" operation on
    // the "from" location, followed immediately by an "add" operation at
    // the target location with the value that was just removed.
    const { from, path } = item;
    const mongoose_from = this.jsonPointerToMongoosePath(from);
    const value = this.document.get(mongoose_from);
    this.remove({ path: from });
    this.add({ path, value });
  }

  test(item) {
    const { path, value } = item;
    const existing_value = this.document.get(path);

    try {
      assert.deepStrictEqual(existing_value, value);
    } catch {
      return false;
    }
  }

  /**
     * Test for whether this object is a top level mongoose object or a subdoc
     * This is done by
     * @param {*} object
     */
  isSubDoc(object, root) {
    if (!root)
      root = this.document;
    return ((object != root) && (object.schema == root.schema))
  }

  /**
     * Mongoose "set" doesn't work with a populated path. This method walks a populated path and ensures 'set' is called on the leaf.
     * @param {*} path
     * @param {*} value
     */
  setPath(path, value) {
    if (path === ""){
      this.document.overwrite(value ?? {});
    } else {
      this.document.set(path, value);
    }
  }

  getDefaultValue(schema) {
    if (!schema) return schema.cast({});
    const defaultValue = schema.defaultValue;
    if (defaultValue === undefined)
      return schema.cast({});
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  }

  /**
     * Walk down a mongoose dotted path, dereferencing objects. Return the value at the 'index' position in the path, or if index isn't specified, the
     * 'leaf' pointed to by the entire path. A negative index will indicate an offset from the end of the path.
     * @param {*} path
     * @param {*} index
     */
  walkPath(path, index) {
    const parts = path.split(".");
    if (typeof index == 'undefined')
      index = parts.length;
    if (index < 0)
      index = parts.length + index;

    let parent = this.document, schema = parent;
    for (let i = 0; i < index; i++) {
      let part = parts[i];
      const is_array = Array.isArray(parent);
      if (is_array) {
        part = part === '-' ? parent.length : parseInt(part);
        if (isNaN(part))
          throw new Error("Invalid index on array: " + part);
        schema = schema.$embeddedSchemaType;
      } else {
        schema = schema.schema.path(part);
      }

      if (i === (parts.length - 1))
        break;

      if (!parent[part])
        parent[part] = this.getDefaultValue(schema);
      parent = parent[part];
    }

    return parent;
  }

  jsonPointerToMongoosePath(path) {
    path = path.substring(1);
    path = path.replace(/\//g,'.');
    return path;
  }
}

module.exports = JSONPatchMongoose;
