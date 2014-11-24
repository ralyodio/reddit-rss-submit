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

    # add this line (runs every 5 minutes)
    */5 * * * * /usr/local/bin/node ~/path/to/reddit-rss-submit/index.js -u user -p pass


## options

- user: reddit uername
- pass: reddit password
- v: verbosity (`-vvv` to increase)
- t: throttle (number of minutes between link submissions, defaults to 10)

LICENSE: MIT
