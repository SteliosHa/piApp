var cool = require('cool-ascii-faces');
var express = require('express');
var bodyParser = require('body-parser');

const httpstatus = require('./httpstatus');
const logger = require('morgan');
const request = require('request');

/* Create Express server.*/
var app = express();

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
require('dotenv').config( {path:'./config/.env'});

// configure app
app.use(logger('dev')); // log requests to the console

// configure body parser
app.use(bodyParser.urlencoded( {extended:true }));
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5050));
app.use(express.static(__dirname + '/public'));

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI); // connect to our database
var Bear = require('./models/bear');

// ROUTES FOR OUR API
// =============================================================================

// create our router
var router = express.Router();

// middleware to use for all requests
router.use(function (req, res, next) {
	// do logging
	console.log('Something is happening.');
	next();
});


app.post('/', (req, res) =>  {
let text = req.body.text;
// implement your bot here ...

	if ( !/^\d + $/.test(req.body.text)) {// not a digit
		res.send('U R DOIN IT WRONG. Enter a status code like 200!');
		return;
	}

	let data =  {
		response_type:'in_channel', // public to the channel
		text:'302: Found',
		attachments:[ {
			image_url:'https://http.cat/302.jpg'
		}
	]};
	res.json(data);

});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
	res.json( {message:'hooray! welcome to our api!'});
});

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
response.render('pages/index');
});

app.get('/cool', function (request, response) {
response.send(cool());
});

app.listen(app.get('port'), function () {
console.log('Node app is running on port', app.get('port'));
});

// Auth - SLACK
app.get('/slack', function(req, res) {

	if ( ! req.query.code) { // access denied
		res.redirect('http://www.girliemac.com/slack-httpstatuscats/');
		return;
	}

	var data =  {form: {
		client_id:process.env.SLACK_CLIENT_ID,
		client_secret:process.env.SLACK_CLIENT_SECRET,
		code:req.query.code
	}};

	request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
		if ( ! error && response.statusCode == 200) {
			// Get an auth token
			let token = JSON.parse(body).access_token;
			// Get the team domain name to redirect to the team URL after auth
			request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
				if ( ! error && response.statusCode == 200) {
					if (JSON.parse(body).error == 'missing_scope') {
						res.send('HTTP Status has been added to your team!');
					}else {
						let team = JSON.parse(body).team.domain;
						res.redirect('http://' +team+ '.slack.com');
					}
				}
			});
		}
	});
});

var Botkit = require('botkit');
var controller = Botkit.slackbot();
var bot = controller.spawn({
  	token: process.env.SLACK_BOT_TOKEN
});
bot.startRTM(function(err,bot,payload) {
  	if (err) {
    	throw new Error('Could not connect to Slack');
  	}
});

/* Add Bot Commands HERE */
controller.hears(["Hello","Hi"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
 	bot.reply(message,'Hello, how are you today?');
});

controller.hears(["Dog","dd"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
 	bot.reply(message,'Hello, how doggy');
});

controller.hears(["Where is Abe?","Abe??"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
 	bot.reply(message,'Damn it Abe');
});

controller.hears(["is 52% failing?","52%"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
 	bot.reply(message,'You Pass');
});

/* *******************************
/* HTTP Status Cats Slash Command
/* ***************************** */

app.get('/slackpost', (req, res) =>  {
	handleQueries(req.query, res);
});

app.post('/slackpost', (req, res) =>  {
	handleQueries(req.body, res);
});

/*
response:
{ token: '2P429UX-------',
  team_id: 'T1L---',
  team_domain: 'girliemac',
  channel_id: 'C1L---',
  channel_name: 'general',
  user_id: 'U1L----',
  user_name: 'girlie_mac',
  command: '/httpstatus',
text:'405',
response_url:'https://hooks.slack.com/commands/--- }
*/

function handleQueries(q, res) {
  if(q.token !== process.env.SLACK_VERIFICATION_TOKEN) {
    // the request is NOT coming from Slack!
    return;
  }
  if (q.text) {
    let code = q.text;

    if(!/^\d+$/.test(code)) { // not a digit
      //res.send('U R DOIN IT WRONG. Enter a status code like 400 😒');
	  	var Slack = require('slack-node');
		apiToken = process.env.SLACK_APP_TOKEN;

		slack = new Slack(apiToken);

		slack.api("users.list", function(err, response) {
  			console.log(response);
		}),

		slack.api('chat.postMessage', {
  			text:'hello nodejs',
  			channel:'#general'
		}),

		slack.api('reminders.add', {
  			text:'hello nodejs',
  			time:"1602288000"
		}),

		function(err, response){
  			console.log(response);
		};

    return;
    }

    let status = httpstatus[code];
    if(!status) {
      res.send('WRONG, ' + code + 'is not an official HTTP status code 🙃');
      return;
    }

    let image = 'https://http.cat/' + code;
    let data = {
      response_type: 'in_channel', // public to the channel
      text: code + ':' + status,
      attachments:[
      {
        image_url: image
      }
    ]};
    res.json(data);
  } else {
    let data = {
      response_type: 'ephemeral', // private message
      text: 'How to use /httpstatus command:',
      attachments:[
      {
        text: 'Type a status code after the command, e.g. `/httpstatus 404`',
      }
    ]};
    res.json(data);
  }
}
