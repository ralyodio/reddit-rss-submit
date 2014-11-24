reddit-rss-submit
=============

## node.js (required)

	#mac
	brew install node

Other OS (windows, linux) should install from source found at http://nodejs.org

## install

    git clone git@github.com:chovy/reddit-rss-submit.git
    cd reddit-rss-submit
    
    #create cache
    mkdir tmp
    echo '{}' > tmp/seen.json
    
    npm install

    # add a cronjob to periodically check
    crontab -e

    # add this line (runs every hour on hh:05)
    5 * * * * /usr/local/bin/node ~/path/to/reddit-rss-submit/index.js -u user -p pass
    
    # use flock to skip runs where script is already running (recommended - allows to run every 5 mins)
    */5 * * * * flock -n /tmp/reddit.lock -c "/path/to/reddit-rss-submit/index.js -u user -p pass"

## configure

Only json is supported, best thing to convert RSS to JSON is to setup a Yahoo pipes over at http://pipes.yahoo.com
You can can then grab the URL of your pipe's output as JSON.

	cp config.sample.json config.json
	
Edit `config.json` to point to the URL of your feed (see yahoo pipes to convert to JSON)

## options

- user: reddit uername
- pass: reddit password
- v: verbosity (`-vvv` to increase)
- t: throttle (number of minutes between link submissions, defaults to 10)

LICENSE: MIT
