/*
 *   Copyright (c) 2020 Ratio Software, LLC
 *   All rights reserved.
 *   @author Clayton Gulick <clay@ratiosoftware.com>
 */
const mms = require("mongodb-memory-server");
const mongoose = require("mongoose");
const assert = require("assert");

const Book = require('./models/book');
const Author = require('./models/author');
const Series = require('./models/series');

let mongod;
let author_id, coauthor_id, collaborator_id;

before(async () => {
  mongod = await mms.MongoMemoryServer.create();
  const connection_string = await mongod.getUri();
  await mongoose.connect(connection_string);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("Transform", () => {

});

describe("Revert Patch", () => {

});

describe("Revert Transformation", () => {

});

describe("Patch", () => {

  beforeEach("Init documents", async () => {
    await Author.deleteMany({});
    await Series.deleteMany({});
    await Book.deleteMany({});

    const author = new Author(
      {
        first_name: "JRR",
        last_name: "Tolkien",
        address: { city: "NoWhere", state:"TX", zip: "12345", address_1: "123 anywhere dr" },
        phone_numbers: ["111-111-1111", "222-222-2222"],
      });
    await author.save();
    author_id = author._id;

    const coauthor = new Author(
      {
        first_name: "Clay",
        last_name: "Gulick",
        address: { city: "NoWhere", state:"TX", zip: "12345", address_1: "123 anywhere dr" },
        phone_numbers: ["111-111-1111", "222-222-2222"],
      });
    await coauthor.save();
    coauthor_id = coauthor._id;

    const collaborator = new Author(
      {
        first_name: "Zaphod",
        last_name: "Beeblebrox",
        address: { city: "NoWhere", state:"TX", zip: "12345", address_1: "123 anywhere dr" },
        phone_numbers: ["111-111-1111", "222-222-2222"],
      });
    await collaborator.save();
    collaborator_id = collaborator._id;

    const series = new Series({ name: "Lord of the Rings", books: [] });
    await series.save();
    series_id = series._id;

    const book = new Book({ name: "The Hobbit", author: author });
    await book.save();
    book_id = book._id;

    series.books.push(book);
    await series.save();

  });

  describe("Add", () => {
    it("Should set a value", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/first_name', op: 'add', value: 'Jimmy' },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.first_name, 'Jimmy');
    });

    it("Should set an undefined value", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/first_name', op: 'add', value: undefined },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.first_name, undefined);
    });

    it("Should set an array value", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/phone_numbers', op: 'add', value: ['1', '2'] },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.deepStrictEqual(author.phone_numbers, ['1', '2']);
    });

    it("Should add a value to the end of an array", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/phone_numbers/-", value: "333-333-3333" },
        { op: "add", path: "/phone_numbers/-", value: "444-444-4444" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      //these already existed
      assert.equal(author.phone_numbers[0], "111-111-1111");
      assert.equal(author.phone_numbers[1], "222-222-2222");
      //new ones
      assert.equal(author.phone_numbers[2], "333-333-3333");
      assert.equal(author.phone_numbers[3], "444-444-4444");
    });

    it("Should add a value to a new array index", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/phone_numbers/2", value: "333-333-3333" },
        { op: "add", path: "/phone_numbers/3", value: "444-444-4444" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      //these already existed
      assert.equal(author.phone_numbers[0], "111-111-1111");
      assert.equal(author.phone_numbers[1], "222-222-2222");
      //new ones
      assert.equal(author.phone_numbers[2], "333-333-3333");
      assert.equal(author.phone_numbers[3], "444-444-4444");
    });

    it("Should add a value to a specified index and shift values to the left", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/phone_numbers/0", value: "000-000-0000" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.phone_numbers[0], "000-000-0000");
      assert.equal(author.phone_numbers[1], "111-111-1111");
      assert.equal(author.phone_numbers[2], "222-222-2222");
    });

    it("Should add a value to the end of a non existing array", async () => {
      let author = await Author.findOne({ _id: author_id });
      author.aliases = undefined;
      const patch = [
        { op: "add", path: "/aliases/names/-", value: "manin" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.deepStrictEqual(author.aliases.names.toObject(), ['manin']);
    });

    it("Should work with super nested paths", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/super_nested/arr/0/obj/field1", value: 123 },
        { op: "add", path: "/super_nested/arr/0/obj/field2", value: "what" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.super_nested.arr[0].obj.field1, 123);
      assert.equal(author.super_nested.arr[0].obj.field2, 'what');
    });

    it("Should work with super nested obj and array", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/super_nested/arr/0/obj/nested_arr/0/field3", value: 'what' },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.super_nested.arr[0].obj.nested_arr[0].field3, 'what');
    });

    it("Should throw error when adding value to index bigger than value array", async () => {
      let error;
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/phone_numbers/100", value: "NO" },
      ];
      try {
        author.jsonPatch(patch);
      } catch (err) {
        error = err;
      }
      assert(error);
      assert.equal(error.message, 'Invalid index value: 100 for array add');
    });

    it("Should work with doubly nested arrays of primitives", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/double_nested_array/0/0", value: 'what' },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.double_nested_array[0][0], 'what');
    });

    it("Should work with doubly nested arrays of primitives adding to the end", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/double_nested_array/-/-", value: 'what' },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.double_nested_array[0][0], 'what');
    });

    it("Should work with tiple nested arrays of primitives", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/triple_nested_array/0/0/0", value: 'what' },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.triple_nested_array[0][0][0], 'what');
    });

    it("Should work with tiple nested arrays of primitives adding to the end", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "add", path: "/triple_nested_array/-/-/-", value: 'what' },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.triple_nested_array[0][0][0], 'what');
    });

  });

  describe("Move", () => {
    it("Should set new path and set old path to null", async () => {

    });

    it("Should move an array element to a new position", async () => {

    });
  });

  describe("Replace", () => {
    it("Should replace a value", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/email_address', op: 'replace', value: 'thedude@lebowski.com' },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.email_address, 'thedude@lebowski.com');
    });

    it("Should set a value on a subdoc", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/address/city', op: 'replace', value: 'New York' },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.equal(author.address.city, 'New York');
    });

    it("Should set a objectId value that's not a ref, and is unset", async () => {
      let book = await Book.findOne({ _id: book_id });
      const patch = [
        { path: '/reference_id', op: 'replace', value: coauthor_id },
      ];
      book.jsonPatch(patch);
      await book.save();
      book = null;
      book = await Book.findOne({ _id: book_id });
      assert.equal(book.reference_id.toString(), coauthor_id.toString());
    });

    it("Should set a objectId value that's not a ref, and is already set", async () => {
      let book = await Book.findOne({ _id: book_id });
      book.reference_id = author_id;
      await book.save();
      const patch = [
        { path: '/reference_id', op: 'replace', value: coauthor_id },
      ];
      book.jsonPatch(patch);
      await book.save();
      book = null;
      book = await Book.findOne({ _id: book_id });
      assert.equal(book.reference_id.toString(), coauthor_id.toString());
    });

    it("Should fail to set a value on a blacklisted path", async () => {
      const book = await Book.findOne({ _id: book_id });
      const patch = [
        { path: '/publisher', op: 'replace', value: 'Random House' },
      ];

      let errored = false;
      try {
        book.jsonPatch(patch);
      }
      catch {
        errored = true;
      }
      assert.equal(errored, true);

    });

    it("Should set a value on a nested empty nested path", async () => {
      let book = await Book.findOne({ _id: book_id });
      const patch = [
        { path: '/coauthor/gets_credit', op: 'replace', value: true },
      ];
      book.jsonPatch(patch);
      await book.save();
      book = null;
      book = await Book.findOne({ _id: book_id });
      assert.equal(book.coauthor.gets_credit, true);
    });
  });

  describe("Remove", () => {
    it("Should set the path to null", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { path: '/first_name', op: 'remove' },
      ];
      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      assert.strictEqual(author.first_name, undefined);
    });

    it("Should remove an array element", async () => {
      let author = await Author.findOne({ _id: author_id });
      const patch = [
        { op: "remove", path: "/phone_numbers/0" },
      ];

      author.jsonPatch(patch);
      await author.save();
      author = null;
      author = await Author.findOne({ _id: author_id });
      //these already existed
      assert.equal(author.phone_numbers[0], "222-222-2222");
    });
  });

  describe("Embedded arrays", () => {
    it("Should add to embedded array doc refs", async () => {
      let book = await Book.findOne({ _id: book_id });
      const patch = [
        { path: '/collaborators/-', op: 'add', value: { gets_credit: true, author: collaborator_id } },
      ];
      book.jsonPatch(patch);
      await book.save();
      book = await Book.findOne({ _id: book_id });
      assert.equal(book.collaborators[0].author.toString(), collaborator_id.toString());
    });
  });
});
