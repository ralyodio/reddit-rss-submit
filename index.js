#!/usr/bin/env node

var Snoocore = require('snoocore');
var cfg = require('./config.json');
var cmd = require('commander');
var reddit = new Snoocore({ userAgent: 'snoocoreExample' });
var request = require('request-promise');
var async = require('async');
var q = require('q');
var fs = require('fs');
var seen = require('./tmp/seen.json');
var moment = require('moment');

//arguments
cmd
	.option('-u, --user [string]', 'Username for reddit')
	.option('-p, --pass [string]', 'Password for reddit')
	.option('-v, --verbose', 'A value that can be increased', increaseVerbosity, 0)
	.option('-t, --throttle [integer]', 'Number of minutes between submissions', 10)
	.parse(process.argv);


start();


function increaseVerbosity(v, total) {
	return total + 1;
}

function getLinks(url){
	return request.get(url, { json: true })
		.then(function(data){
			return data.value.items.sort(function(a, b){
				var aUnix = moment(new Date(a.pubDate)).unix();
				var bUnix = moment(new Date(b.pubDate)).unix();

				return bUnix - aUnix;
			});
		});
}

function submitLink(item){
	var def = q.defer();
	seen = require('./tmp/seen.json');

	if ( seen[item.link] ) {
		if ( cmd.verbose ) console.log('Seen %s %s', item.link, item.pubDate);

		def.resolve();
		return def.promise;
	}

	seen[item.link] = true;

	if ( cmd.verbose ) {
		console.log('Submitting: %s, %s, %s', item.title, item.link, item.pubDate);
	}

	return reddit('/api/submit').post({
		title: item.title,
		url: item.link,
		kind: 'link',
		resubmit: false,
		sr: cfg.subreddit // The "fullname" for the "aww" subreddit.
	});
}

function start(){
	reddit.login({
		username: cmd.user,
		password: cmd.pass
	})
		.then(function(loginData){
			return reddit('/api/me.json').get();
		})
		.then(function(){
			return getLinks(cfg.feedUrl);
		})
		.then(function(items){
			var def = q.defer();
			var secs = 0;

			async.each(items, function(item, cb){
				setTimeout(function(){
					submitLink(item)
						.then(function(data){
							fs.writeFile('./tmp/seen.json', JSON.stringify(seen), function(err){
								if ( err ) throw err;
								cb();
							});
						})
						.catch(function(err){
							cb(err);
						});
				}, secs);

				secs += cmd.throttle*60*1000; //every x minutes
			}, function(err){
				if ( err ) {
					console.error(err);
					return def.reject(err);
				}

				if ( cmd.verbose ) console.log('Done submitting links');
				def.resolve();
			});

			return def.promise;
		})
		.then(function(data){
			if ( cmd.verbose ) console.log('Done with all submissions.');
		})
		.catch(function(err){
			console.error(err);
		});
}


