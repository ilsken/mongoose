/*!
 * Module dependencies
 */

var Promise = require('./promise')
  , util = require('util')
  , utils = require('./utils')

/**
 * Aggregate constructor used for building aggregation pipelines.
 *
 * ####Example:
 *
 *     new Aggregate();
 *     new Aggregate({ $project: { a: 1, b: 1 } });
 *     new Aggregate({ $project: { a: 1, b: 1 } }, { $skip: 5 });
 *     new Aggregate([{ $project: { a: 1, b: 1 } }, { $skip: 5 }]);
 *
 * Returned when calling Model.aggregate().
 *
 * ####Example:
 *
 *     Model
 *     .aggregate({ $match: { age: { $gte: 21 }}})
 *     .unwind('tags')
 *     .exec(callback)
 *
 * ####Note:
 *
 * - The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
 * - Requires MongoDB >= 2.1
 *
 * @see aggregation http://docs.mongodb.org/manual/applications/aggregation/
 * @see driver http://mongodb.github.com/node-mongodb-native/api-generated/collection.html#aggregate
 * @param {Object} [...] aggregation operator(s) or operator array
 * @api public
 */

function Aggregate () {
  this._pipeline = [];
  this._model = undefined;

  if (1 === arguments.length && util.isArray(arguments[0])) {
    this.append.apply(this, arguments[0]);
  } else {
    this.append.apply(this, arguments);
  }
}

/**
 * Binds this aggregate to a model.
 *
 * @param {Model} model the model to which the aggregate is to be bound
 * @return {Aggregate}
 * @api private
 */

Aggregate.prototype.bind = function (model) {
  this._model = model;
  return this;
}

/**
 * Appends new operators to this aggregate pipeline
 *
 * ####Examples:
 *
 *     aggregate.append({ $project: { field: 1 } }, { $limit: 2 });
 *
 * @param {Object} op operators to append
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.append = function () {
  var args = utils.args(arguments)
    , arg;

  if (!args.every(isOperator)) {
    throw new Error("Arguments must be aggregate pipeline operators");
  }

  this._pipeline = this._pipeline.concat(args);

  return this;
}

/**
 * Appends a new $project operator to this aggregate pipeline.
 *
 * Mongoose query [selection syntax](#query_Query-select) is also supported.
 *
 * ####Examples:
 *
 *     // include a, include b, exclude _id
 *     aggregate.project("a b -_id");
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     aggregate.project({a: 1, b: 1, _id: 0});
 *
 *     // reshaping documents
 *     aggregate.project({
 *         newField: '$b.nested'
 *       , plusTen: { $add: ['$val', 10]}
 *       , sub: {
 *            name: '$a'
 *         }
 *     })
 *
 *     // etc
 *     aggregate.project({ salary_k: { $divide: [ "$salary", 1000 ] } });
 *
 * @param {Object|String} arg field specification
 * @see projection http://docs.mongodb.org/manual/reference/aggregation/project/
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.project = function (arg) {
  var fields = {};

  if ('object' === typeof arg && !util.isArray(arg)) {
    Object.keys(arg).forEach(function (field) {
      fields[field] = arg[field];
    });
  } else if (1 === arguments.length && 'string' === typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
    });
  } else {
    throw new Error("Invalid project() argument. Must be string or object");
  }

  return this.append({ $project: fields });
}

/**
 * Appends a new custom $group operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.group({ _id: "$department" });
 *
 * @see $group http://docs.mongodb.org/manual/reference/aggregation/group/
 * @method group
 * @memberOf Aggregate
 * @param {Object} arg $group operator contents
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new custom $match operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.match({ department: { $in: [ "sales", "r&d" } } });
 *
 * ####Note:
 *
 * For now query-like syntax is not supported (eg .where("department").in(["sales", "r&d"]))
 *
 * @see $match http://docs.mongodb.org/manual/reference/aggregation/match/
 * @method match
 * @memberOf Aggregate
 * @param {Object} arg $match operator contents
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $skip operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.skip(10);
 *
 * @see $skip http://docs.mongodb.org/manual/reference/aggregation/skip/
 * @method skip
 * @memberOf Aggregate
 * @param {Number} arg number of records to skip before next stage
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $limit operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.limit(10);
 *
 * @see $limit http://docs.mongodb.org/manual/reference/aggregation/limit/
 * @method limit
 * @memberOf Aggregate
 * @param {Number} arg maximum number of records to pass to the next stage
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $geoNear operator to this aggregate pipeline.
 *
 * ####NOTE:
 *
 * Must be used as the first operator in the pipeline.
 *
 * ####Examples:
 *
 *     aggregate.geoNear({
 *       near: [40.724, -73.997],
 *       distanceField: "dist.calculated", // required
 *       maxDistance: 0.008,
 *       query: { type: "public" },
 *       includeLocs: "dist.location",
 *       uniqueDocs: true,
 *       num: 5
 *     });
 *
 * @see $geoNear http://docs.mongodb.org/manual/reference/aggregation/geoNear/
 * @method geoNear
 * @memberOf Aggregate
 * @param {Object} geoNear parameters
 * @return {Aggregate}
 * @api public
 */

'group match skip limit geoNear'.split(' ').forEach(function ($operator) {
  Aggregate.prototype[$operator] = function (arg) {
    var op = {};
    op['$' + $operator] = arg;
    return this.append(op);
  };
});

/**
 * Appends new custom $unwind operator(s) to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.unwind("tags");
 *     aggregate.unwind("a", "b", "c");
 *
 * @see $unwind http://docs.mongodb.org/manual/reference/aggregation/unwind/
 * @param {String} fields the field(s) to unwind
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.unwind = function () {
  var args = utils.args(arguments);

  return this.append.apply(this, args.map(function (arg) {
    return { $unwind: '$' + arg };
  }));
}

/**
 * Appends a new $sort operator to this aggregate pipeline.
 *
 * If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Examples:
 *
 *     // these are equivalent
 *     aggregate.sort({ field: 'asc', test: -1 });
 *     aggregate.sort('field -test');
 *
 * @see $sort http://docs.mongodb.org/manual/reference/aggregation/sort/
 * @param {Object|String} arg
 * @return {Query} this
 * @api public
 */

Aggregate.prototype.sort = function (arg) {
  var sort = {};

  if ('Object' === arg.constructor.name) {
    var desc = ['desc', 'descending', -1];
    Object.keys(arg).forEach(function (field) {
      sort[field] = desc.indexOf(arg[field]) === -1 ? 1 : -1;
    });
  } else if (1 === arguments.length && 'string' == typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var ascend = '-' == field[0] ? -1 : 1;
      if (ascend === -1) field = field.substring(1);
      sort[field] = ascend;
    });
  } else {
    throw new TypeError('Invalid sort() argument. Must be a string or object.');
  }

  return this.append({ $sort: sort });
}

/**
 * Executes the aggregate pipeline on the currently bound Model.
 *
 * ####Example:
 *
 *     aggregate.exec(callback);
 *
 * Because a promise is returned, the `callback` is optional.
 *
 * ####Example:
 *
 *     var promise = aggregate.exec();
 *
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Aggregate.prototype.exec = function (callback) {
  var promise = new Promise();

  if (callback) {
     promise.addBack(callback);
  }

  if (!this._pipeline.length) {
    promise.error(new Error("Aggregate has empty pipeline"));
    return this;
  }

  if (!this._model) {
    promise.error(new Error("Aggregate not bound to any Model"));
    return this;
  }

  this._model
    .collection
    .aggregate(this._pipeline, promise.resolve.bind(promise));

  return promise;
}

/*!
 * Helpers
 */

/**
 * Checks whether an object is likely a pipeline operator
 *
 * @param {Object} obj object to check
 * @return {Boolean}
 * @api private
 */

function isOperator (obj) {
  var k;

  if ('object' !== typeof obj) {
    return false;
  }

  k = Object.keys(obj);

  return 1 === k.length && k.some(function (key) {
    return '$' === key[0];
  });
}

/*!
 * Exports
 */

module.exports = Aggregate;
