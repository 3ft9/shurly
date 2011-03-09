var sys   = require('sys');
var mongo = require('mongodb');

var helpers = require('../helpers');

var collectionURLs;
var config;
exports.data = {
	// Connect to MongoDB
	init : function(params, callback) {
		config = params;
		new mongo.Db(config.db, new mongo.Server(config.host, config.port, {})).open(function (err, db) {
			if (err) {
				callback('Mongo: ' + err);
			} else {
				db.collection('urls', function(err, c) {
					collectionURLs = c;
					callback(undefined);
				});
			}
		});
	},
	
	// Shorten a URL
	// I know the distribution of responsibilities require this method to
	// actually generate the short URL as well as store it, but it's easier
	// that way and that type of elegance is not my goal here.
	shortenURL : function (url, callback) {
		collectionURLs.find({'url' : url}, function(err, cursorLookup) {
			if (err) {
				callback('Mongo: ' + err);
			} else {
				cursorLookup.nextObject(function(err, doc) {
					if (err) {
						callback('Mongo: ' + err);
					} else {
						if (doc != null) {
							// Exists - return it
							callback(undefined, doc);
						} else {
							// Does not exist, create a new short URL
							collectionURLs.find({'_id' : 0}, function(err, cursorGetKey) {
								if (err) {
									callback('Mongo: key: ' + err);
								} else {
									cursorGetKey.nextObject(function(err, doc) {
										if (doc == null) {
											// No existing key, make a new one
											doc = {'_id' : 0, 'val' : 0};
											collectionURLs.insert(doc);
										}
										// Increment and update that doc
										// TODO: Haven't even attempted to handle the race condition yet.
										//      This, of course, means that you can't run more than one
										//      node worker process behind a load balancer with this
										//      design, but how likely is that?!
										doc.val++;
										collectionURLs.update({'_id':0}, doc);
										
										// Insert a new short URL document for this new URL
										var newDoc = {
											'url' : url,
											'short_url' : helpers.base(doc.val, config.allowedChars),
											'created_at' : helpers.getTimestamp(),
											'hits' : 0,
											'last_hit_at' : 0,
										};
										collectionURLs.insert(newDoc, function(err, docs) {
											if (!err) {
												// Job done
												callback(undefined, newDoc);
											} else {
												callback('Mongo: insert: ' + err);
											}
										});
									});
								}
							});
						}
					}
				});
			}
		});
	},
	
	get : function(shortURL, registerHit, callback) {
		collectionURLs.find({'short_url' : shortURL}, function(err, cursor) {
			if (err) {
				callback('Mongo: ' + err);
			} else {
				cursor.nextObject(function(err, doc) {
					if (err) {
						callback('Mondo: ' + err);
					} else {
						if (!doc) {
							callback('not found');
						} else {
							if (registerHit) {
								// Register this as a hit
								doc.hits++;
								doc.last_hit_at = helpers.getTimestamp();
								collectionURLs.update({'_id':doc._id}, doc);
							}
							callback(undefined, doc);
						}
					}
				});
			}
		});
	},
};
