reddit-rss-submit
=============

## node.js (required)

	#mac
	brew install node

Other OS (windows, linux) should install from source found at http://nodejs.org

## install

    git clone git@github.com:chovy/kimsufi-alert.git
    cd kimsufi-alert
    npm install

    # add a cronjob to periodically check
    crontab -e

    # add this line (runs every 5 minutes)
    */5 * * * * /usr/local/bin/node ~/path/to/kimsufi-alert/index.js


## configure

Create a custom config file and edit as desired:

    cp config.sample.json config.json
    
Be sure to update with your real smtp and sms settings. Either notification service can be disabled. 

You can also remove/add your desired packages and zones to monitor in your custom config file (see list below).

The host and port are hardcoded (not read from `process.env`).
The other SMS details and SMTP credentials are taken from the environment (do not hardcode them in the config file).

You can change the name of the `ENV` variable, but the defaults should be fine.

    	"env": {
    		"smtp": {
    			"host": "smtp.gmail.com", //hardcoded
    			"port": 465, //hardcoded
    			"user": "SMTP_USER", //read from process.env.SMTP_USER
    			"pass": "SMTP_PASS" //read from process.env.SMTP_PASS
    		},
    		"sms": {
    			"sid": "TWILIO_ACCOUNT_SID", //read from process.env.TWILIO_ACCOUNT_SID
    			"auth": "TWILIO_AUTH_TOKEN"  //read from process.env.TWILIO_AUTH_TOKEN 
    		}
    	},

If you're not sure what your SMTP settings are, you can find the common providers here:

https://github.com/andris9/nodemailer-wellknown/blob/master/services.json
    
Set your SMTP user and password environment variables to receive email notifications:

	# in ~/.bashrc
	export SMTP_USER=me@gmail.com
	export SMTP_PASS=xyz
	. ~/.bashrc
	
	# from command line execution (ie: crontab)
	SMTP_USER=me@gmail.com SMTP_PASS=xyz /usr/local/bin/node ~/path/to/kimsufi-alert/index.js

Set your SMS Twilio provider environment variables to receive sms notifications:

	# in ~/.bashrc
	export TWILIO_ACCOUNT_SID=aaa
	export TWILIO_AUTH_TOKEN=bbb
	
	# from command line execution (ie: crontab)
	TWILIO_ACCOUNT_SID=aaa TWILIO_AUTH_TOKEN=bbb /usr/local/bin/node ~/path/to/kimsufi-alert/index.js

Twilio is the only SMS provider supported, they will give you a SEND FROM phone number, and you can then send to any phone number once you sign up.

## running

Best from a cronjob on periodic intervals:

	cd kimsufi-alert
	
	# edit config.json first (copied from config.sample.json)
	
	./index.js
	
	# ignore last run and force it to send a notification (good for testing)
	./index.js --force 
	
	# from crontab (must run node explicitly)
	crontab -e
	*/5 * * * * SMTP_USER=me@gmail.com SMTP_PASS=xyz TWILIO_ACCOUNT_SID=aaa TWILIO_AUTH_TOKEN=bbb /usr/local/bin/node /path/to/kimsufi-alert/index.js

Be default, `kimsufi-alert` will only send a notification if the results are different than the last run.
This avoids getting spammed with email and sms every 5 minutes. 



LICENSE: MIT
