/**
 * Module dependencies.
 */
var express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , twitter = require('ntwitter')
  , cronJob = require('cron').CronJob
  , _ = require('underscore')
  , path = require('path');

// create a file system to write to the json file
var fs = require('fs');
var tweetJSON = [];

//Create an express app
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

// Twitter foods array. We want a list for allFoods, and then we will check that list against the healthy and unhealthy foods list
var allFoods = ['salad', 'salmon', 'tofu', 'vegetables', 'avocado', 'broccoli', 'spinach', 'sweet potatoes', 'berries', 'dark chocolate', 'hamburger', 'pizza', 'french fries', 'fried chicken', 'hot dog', 'cinnamon roll', 'ice cream', 'soda', 'bbq', 'candy'];
var healthyFoods =  ['salad', 'salmon', 'tofu', 'vegetables', 'avocado', 'broccoli', 'spinach', 'sweet potatoes', 'berries', 'dark chocolate'];
var unhealthyFoods = ['hamburger', 'pizza', 'french fries', 'fried chicken', 'hot dog', 'cinnamon roll', 'ice cream', 'soda', 'bbq', 'candy'];

//These object structures keep track of the total number of tweets for each category, and a map of all the foods and how many tweets they've each gotten
var healthyList = {
    total: 0,
    foods: {}
};

var unhealthyList = {
    total: 0,
    foods: {}
};

var currentTweet;
var currentPhotoURL;
var currentTweetURL;

//Set the food lists to zero.
_.each(healthyFoods, function(v) { healthyList.foods[v] = 0; });
_.each(unhealthyFoods, function(v) { unhealthyList.foods[v] = 0; });


//Generic Express setup
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
// setup template engine - we're using Hogan-Express
app.set('view engine', 'html');
app.set('layout','layout');
app.engine('html', require('hogan-express')); // https://github.com/vol4ok/hogan-express
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// the dataObject we are sending to the page, includes all the data we need
var dataObject = {
  healthData: healthyList, 
  unhealthData: unhealthyList,
  tweet: []
};

//Our only route! Render it with the current healthyList and unhealthyList
app.get('/', function(req, res) {
	res.render('index.html');
});

//Start a Socket.IO listen
var sockets = io.listen(server);

//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});

//If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 

    //Reset the total
    healthyList.total = 0;
    unhealthyList.total = 0;

    //Clear out everything in the map
    _.each(healthyFoods, function(v) { healthyList.foods[v] = 0; });
    _.each(unhealthyFoods, function(v) { unhealthyList.foods[v] = 0; });

    socket.emit('connection', dataObject);
});

//Set up the twitter component

var t = new twitter({
      consumer_key: 'HERLR3SfVGutshK5Nkew', 
      consumer_secret: 'bTRnn8EFxCMC1k8mPzGyJzceC1wlBawlJv7sZ0jQHE',
      access_token_key: '81014526-0wOYZQPGHbUyJPzPGDv9jI5ZKzWY4BVfaR9I4rBqw',
      access_token_secret: 'FDq4Iokv3qiuBiw1lfEQwnV5VwwnrABOhHnXjN1BSAU'
});

//Tell the twitter API to filter on the allFoods, and then we will see if the foods are in our healthy or unhealthy list
// Here, we are filtering the location to just tweets in the United States
t.stream('statuses/filter', { track: allFoods}, function(stream) {

  //We have a connection. Now watch the 'data' event for incomming tweets.
  stream.on('data', function(tweet) {

    //These variables are used to indicate whether a food was actually mentioned.
    var healthyClaimed = false;
    var unhealthyClaimed = false;

    //Make sure it was a valid tweet
    if (tweet.text !== undefined) {

      //We're gunna do some indexOf comparisons and we want it to be case agnostic.
      var text = tweet.text.toLowerCase();

      // we need to know whether or not there is some indication they ate the food or wanted it. 
      // So let's only use tweets that some key words that show desire: eat, want, delicious, lunch, breakfast, dinner, snack
      var ateIt = false;
      if (text.indexOf('delicious') !== -1 || text.indexOf('eat') !== -1 || text.indexOf('want') !== -1 || text.indexOf('lunch') !== -1 || text.indexOf('breakfast') !== -1 || text.indexOf('dinner') !== -1 || text.indexOf('snack') !== -1){
         ateIt = true;
      }

      //Go through every health and then unhealthy food and see if it was mentioned. If so, increment its counter and
      //set its 'claimed' variable to true to indicate something was mentioned so we can increment
      //the 'total' counter!
      _.each(healthyFoods, function(v) {
          if (text.indexOf(v.toLowerCase()) !== -1 && ateIt) {
                    healthyList.foods[v]++;
                    healthyClaimed = true;
                    dataObject.tweet.push(tweet.text);
                    dataObject.tweet.push(tweet.user.profile_image_url);
                    dataObject.tweet.push("https://twitter.com/" + tweet.user.screen_name +"/status/" + tweet.id_str);
                    dataObject.tweet.push(v);
                    dataObject.tweet.push(healthyList.foods[v]);
              }
      });

      _.each(unhealthyFoods, function(v) {
          if (text.indexOf(v.toLowerCase()) !== -1 && ateIt) {
                    unhealthyList.foods[v]++;
                    unhealthyClaimed = true;
                    dataObject.tweet.push(tweet.text);
                    dataObject.tweet.push(tweet.user.profile_image_url);
                    dataObject.tweet.push("https://twitter.com/" + tweet.user.screen_name +"/status/" + tweet.id_str);
                    dataObject.tweet.push(v);
                    dataObject.tweet.push(unhealthyList.foods[v]);
              }

      });

      //If something was mentioned, increment the total counter and send the update to all the clients
      if (healthyClaimed) {
          //send tweet to master json
          //writeFile(tweet);
          //Increment total
          healthyList.total++;
          //Send to all the clients
          sockets.sockets.emit('data', dataObject);
          dataObject.tweet.length = 0; 
      }

      if (unhealthyClaimed) {
          //send tweet to master json
          //writeFile(tweet);
          //Increment total
          unhealthyList.total++;
          //Send to all the clients
          sockets.sockets.emit('data', dataObject);
          dataObject.tweet.length = 0; 

      }
    }
  });
});

function writeFile(tweet){

  var newJSON = JSON.stringify(tweet);
  tweetJSON.push(newJSON);
  console.log(tweetJSON.length);
  fs.writeFile('tweets.json', tweetJSON, function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
  }); 

}

//Reset everything on a new day!
new cronJob('0 0 0 * * *', function(){
    //Reset the total
    healthyList.total = 0;
    unhealthyList.total = 0;

    //Clear out everything in the map
    _.each(healthyFoods, function(v) { healthyList.foods[v] = 0; });
    _.each(unhealthyFoods, function(v) { unhealthyList.foods[v] = 0; });

    //Send the update to the clients
    socket.emit('data', dataObject);

}, null, true);

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
