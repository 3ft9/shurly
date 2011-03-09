var http = require('http');
var querystring = require('querystring');
var fs = require('fs');

var config = require('./config').config;
var helpers = require('./helpers');
var data = require('./dataProviders/' + config.dataProvider).data;

var staticHeader = 'Loading...';
var staticFooter = 'Loading...';
var staticIndex = 'Loading...';
var staticCreate = 'Loading...';
var staticNotFound = 'Loading...';
var staticError = 'Loading...';

// Preload the static responses
fs.readFile('./static/header.html', function (err, doc) { staticHeader = doc.toString(); });
fs.readFile('./static/footer.html', function (err, doc) { staticFooter = doc.toString(); });
fs.readFile('./static/index.html', function (err, doc) { staticIndex = doc.toString(); });
fs.readFile('./static/info.html', function (err, doc) { staticInfo = doc.toString(); });
fs.readFile('./static/404.html', function (err, doc) { staticNotFound = doc.toString(); });
fs.readFile('./static/error.html', function (err, doc) { staticError = doc.toString(); });

// Connect to the data provider
data.init(config.dataParams, function (err) {
	if (err) {
		console.log(err);
	} else {
		// Set up the HTTP server
		http.createServer(function(req, res) {
	
			switch (req.url) {

				case '/':
					// Send the index page
					res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
					res.write(staticHeader);
					res.write(staticIndex);
					res.write(staticFooter);
					res.end();
					break;

				case '/favicon.ico':
					// Send an empty response
					res.writeHead(200, 'OK', {'Content-Type': 'image/gif'});
					res.end();
					break;
				
				case '/shorten':
					if (req.method == 'POST') {
						var postData = '';

						req.on('data', function(chunk) {
							postData += chunk.toString();
						});

						req.on('end', function() {
							// parse the received body data
							var qs = querystring.parse(postData);
						
							// Check the incoming URL
							if (helpers.validateURL(qs.url)) {
								if (qs.url.indexOf(config.siteDomain) == -1) {
									data.shortenURL(qs.url, function(err, info) {
										res.writeHead(302, 'Moved Temporarily', {'Location': '/info/' + info.short_url});
										res.end('<html><head><title>Redirecting...</title></head><body>The page you want is here: <a href="/info/' + info.short_url + '">' + info.short_url + '</a>.</body></html>');
									});
								} else {
									res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
									res.write(staticHeader);
									res.write(staticError.replace(/%%error%%/g, 'Please don\'t try redirecting to me!'));
									res.write(staticFooter);
									res.end();
								}
							} else {
								res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
								res.write(staticHeader);
								res.write(staticError.replace(/%%error%%/g, 'Please enter a valid URL'));
								res.write(staticFooter);
								res.end();
							}
						});
					} else {
						res.writeHead(405, 'Method not supported', {'Content-Type': 'text/html'});
						res.end('<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>');
					}
					break;
			
				default:
					if (req.url.substring(0, 6) == '/info/') {
						// Serve the info URL
						data.get(req.url.substring(6), 0, function(err, info) {
							if (!err) {
								res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
								res.write(staticHeader);
								res.write(
									staticInfo
										.replace(/%%short_url%%/g, info.short_url)
										.replace(/%%dest_url%%/g, helpers.encoder.htmlEncode(info.url))
										.replace(/%%date_created%%/g, helpers.formatTimestamp(info.created_at))
										.replace(/%%hits%%/g, info.hits)
										.replace(/%%date_lasthit%%/g, (info.last_hit_at == 0 ? '<i>Never</i>' : helpers.formatTimestamp(info.last_hit_at)))
									);
								res.write(staticFooter);
								res.end();
							} else {
								res.writeHead(404, 'Not Found', {'Content-Type': 'text/html'});
								res.write(staticHeader);
								res.write(staticNotFound);
								res.write(staticFooter);
								res.end();
							}
							res.write(staticFooter);
							res.end();
						});
					} else {
						// Look for the URL in the DB
						data.get(req.url.substring(1), 1, function(err, info) {
							if (err) {
								if (err == 'not found') {
									res.writeHead(404, 'Not Found', {'Content-Type': 'text/html'});
									res.write(staticHeader);
									res.write(staticNotFound);
									res.write(staticFooter);
									res.end();
								} else {
									res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
									res.write(staticHeader);
									res.write(staticError.replace(/%%error%%/g, 'An error occurred!<br />' + helpers.encoder.htmlEncode(err)));
									res.write(staticFooter);
									res.end();
								}
							} else {
								res.writeHead(301, 'Moved Permanently', {'Location': info.url});
								res.end('<html><head><title>Redirecting...</title></head><body>The page you want is here: <a href="' + helpers.encoder.htmlEncode(info.url) + '">' + helpers.encoder.htmlEncode(info.url) + '</a>.</body></html>');
							}
						});
					}
					break;
			}

		}).listen(config.http.port, config.http.ip);

		console.log('HTTP server listening on http://' + config.http.ip + ':' + config.http.port + '/');
	}
});
