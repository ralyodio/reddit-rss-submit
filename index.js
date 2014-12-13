#!/usr/bin/env node

var Snoocore = require('snoocore');
var ProgressBar = require('progress');
var cfg = require('./config.json');
var cmd = require('commander');
var reddit = new Snoocore({ userAgent: 'reddit-rss-submit/1.0' });
var request = require('request-promise');
var async = require('async');
var q = require('q');
var fs = require('fs');
var seen = require(__dirname + '/tmp/seen.json');
var moment = require('moment');
var winston = require('winston');

var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({ filename: __dirname + '/tmp/run.log' })
	]
});

var intv = {};

//arguments
cmd
	.option('-u, --user [string]', 'Username for reddit')
	.option('-p, --pass [string]', 'Password for reddit')
	.option('-r, --filter [string]', 'A keyword to filter on the feed', cfg.filter)
	.option('-f, --force', 'Ignore previous runs, force')
	.option('-s, --subreddit [string]', 'A subreddit to post to.', cfg.subreddit)
	.option('-t, --throttle [n]', 'Number of minutes between submissions', cfg.throttle)
	.option('-v, --verbose', 'A value that can be increased', increaseVerbosity, 0)
	.option('-m, --multi', 'Use multi submission configuration')
	.parse(process.argv);

start();

function increaseVerbosity(v, total) {
	return total + 1;
}

function getFeedUrl(feedItem){
	return request.get(feedItem.feedUrl, { json: true })
		.then(function(data){
			var item;
			var newItemIdx;
			var items = data.value.items.sort(function(a, b){
				var aUnix = moment(new Date(a.pubDate)).unix();
				var bUnix = moment(new Date(b.pubDate)).unix();

				return bUnix - aUnix;
			});

			//if item has been seen, remove it from the list
			for ( var i= 0, l=items.length; i<l; i++ ){
				newItemIdx = i;
				item = items[i];

				if ( !seen[item.link] ) {
					logger.log('info', 'Not seen, using link: %s -- %s', item.title, item.link);

					//save query info to result
					item.subreddit = feedItem.subreddit;
					item.feedUrl = feedItem.feedUrl;
					item.filter = feedItem.filter;
					//seen[item.link] =  true;

					break;
				}

				logger.log('warn', 'Skipping (seen) %s -- %s', item.title, item.link);
			}

			//only return one for now (the latest fresh one)
			return items.slice(newItemIdx, newItemIdx+1);
		});
}

function getLinks(feedItems){
	var promises = feedItems.map(getFeedUrl);

	return q.all(promises)
		.then(function(arguments){
			var items = [];

			//flatten list
			items = arguments.reduce(function(a, b){
				return a.concat(b);
			});

			return items;
		});
}

function submitLink(item){
	var def = q.defer();
	//seen = require(__dirname + '/tmp/seen.json');

	if ( !cmd.force && seen[item.link] ) {
		if ( cmd.verbose ) logger.log('info', 'Seen %s %s', item.link, item.pubDate);

		def.resolve();
		return def.promise;
	}

	if ( cmd.verbose ) {
		logger.log('info', 'Submitting: %s, %s', item.title, item.pubDate);
		logger.log('info', 'to reddit: %s: %s - %s', item.filter, item.subreddit, item.link)
	}

	return reddit('/api/submit').post({
		title: item.title,
		url: item.link,
		kind: 'link',
		resubmit: false,
		api_type: 'json',
		sr: item.subreddit
	});
}

function progressBar(){
	if ( intv.countdown ) clearInterval(intv.countdown);

	var total = cmd.throttle*60*10 - 100; //reduce by 10 seconds
	var bar = new ProgressBar(':bar', { total: total });

	logger.log('info', 'Waiting for %d minutes', cmd.throttle);

	intv.countdown = setInterval(function(){
		bar.tick();

		if (bar.complete) {
			logger.log('info', '\nsending next request...\n');
			clearInterval(intv.countdown);
		}
	}, 100);
}


function start(){
	reddit.login({
		username: cmd.user,
		password: cmd.pass
	})
		.then(function(loginData){
			return reddit('/api/me.json').get();
		})
		.then(function(me){
			var url = cfg.feedUrl;

			var items = cmd.multi ? cfg.multi : [];

			//multi mode
			if ( cmd.multi && items.length ) {
				items.map(function(item){
					item.feedUrl = url + '&filter=' + item.filter;
					item.subreddit = item.subreddit;

					return item;
				});
			}
			//single mode
			else {
				//command line option for filter
				if ( cmd.filter ) {
					items[0].feedUrl = url + '&filter=' + cmd.filter;
					items[0].subreddit = cmd.subreddit ? cmd.subreddit : cfg.subreddit;
				}
				//config file
				else {
					items[0].feedUrl = url + '&filter=' + cfg.filter;
					items[0].subreddit = cmd.subreddit ? cmd.subreddit : cfg.subreddit;
				}
			}

			logger.log('warn', 'Items to get links for', items);
			return getLinks(items);
		})
		.then(function(items){
			var def = q.defer();
			var secs = 0;

			async.each(items, function(item, cb){
				setTimeout(function(){

					submitLink(item)
						.then(function(data){
							data = data && data.json;

							logger.log('warn', 'response from submission to: %s', 'http://reddit.com/r/'+item.subreddit);

							if ( data ) {
								if ( data.errors ) {
									logger.log('warn', data.errors[0].join(' '));
								} else if ( data.ratelimit ) {
									logger.log('warn', 'rate limit hit: try again in %s mins', data.ratelimit/60);
								} else if (data.data.url){
									logger.log('info', 'submitted to page: %s', data.data.url);

									//it was successfully submitted, mark as seen
									seen[item.link] = true;
								}
							}

							fs.writeFile(__dirname + '/tmp/seen.json', JSON.stringify(seen), function(err){
								if ( err ) throw err;

								progressBar();
								cb();
							});
						})
						.catch(function(err){
							cb(err);
						});
				}, secs);

				secs += cmd.throttle*60*1000; //every x minutes
			}, function(err){
				clearInterval(intv.countdown);

				if ( err ) {
					logger.error(err);
					return def.reject(err);
				}

				if ( cmd.verbose ) logger.log('info', 'Done submitting links');
				def.resolve();
			});

			return def.promise;
		})
		.then(function(data){
			if ( cmd.verbose ) logger.log('info', 'Done with all submissions.');
		})
		.catch(function(err){
			logger.error(err);
		});
}
