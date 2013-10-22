$(function() {
    var socket = io.connect(window.location.hostname);

    var startingHealthTotal;
    var startingUnhealthTotal;
    var startingTotal;

    socket.on('connect', function() {
        console.log("Connected");
    });

    // Receive a message
    socket.on('connection', function(data) {
        startingHealthTotal = data.healthData.total;
        startingUnhealthTotal = data.unhealthData.total;
        startingTotal = data.healthData.total + data.unhealthData.total;
    });


    socket.on('data', function(data) {

        var healthTotal = data.healthData.total - startingHealthTotal;
        var unhealthTotal = data.unhealthData.total - startingUnhealthTotal;
        var totalTweets = (data.healthData.total + data.unhealthData.total) - startingTotal;
        var tweet = data.tweet[0];
        var photoURL = data.tweet[1]; 
        var tweetURL = data.tweet[2]; 
        var food = data.tweet[3]; 
        var foodCount = data.tweet[4]; 

        console.log(food);
        console.log(foodCount);
        // deal with the cases where some of the foods have spaces
        if (food === "sweet potatoes"){
            food = "sweet-potatoes";
        }

        if (food === "dark chocolate"){
            food = "dark-chocolate";
        }

        if (food === "french fries"){
            food = "french-fries";
        }

        if (food === "fried chicken"){
            food = "fried-chicken";
        }

        if (food === "hot dog"){
            food = "hot-dog";
        }

        if (food === "cinnamon roll"){
            food = "cinnamon-roll";
        }

        if (food === "ice cream"){
            food = "ice-cream";
        }

    // we are going to append the current tweet to the correct place
    // first set up the html
    var html = '<li><a href='+tweetURL+' target=\'_blank\'><img src='+photoURL+' height=\'30\' width=\'30\'></li>';

    //then append that to the correct food
    $("#"+food).append(html);

    // now let's update the number of tweets for that food            
    $('#tweetCount-'+food).text(foodCount);

    // for the top area of the page, here we do all the calculations on the total tweets and the percentage breakdown
    $("#tweetCount").text(totalTweets);

    var healthyWidth = Math.round((healthTotal / totalTweets) * 100);
    var unhealthyWidth = Math.round((unhealthTotal / totalTweets) * 100);        

    if((healthyWidth + unhealthyWidth) > 100){
        unhealthyWidth = Math.floor((unhealthTotal / totalTweets) * 100);
    }        

    $("#good-chart").css("width", healthyWidth +"%");
    $("#bad-chart").css("width", unhealthyWidth +"%");

    $("#goodData").text(healthyWidth + "% (" + healthTotal +")");
    $("#badData").text(unhealthyWidth + "% (" + unhealthTotal +")");



    $('#last-update').text(new Date().toTimeString());

    });

})