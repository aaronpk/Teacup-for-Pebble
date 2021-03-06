/**
 * Welcome to Pebble.js!
 */

var UI = require('ui');
var ajax = require('ajax');
var Vibe = require('ui/vibe');
var Settings = require('settings');

var baseUrl = 'https://teacup.p3k.io';

var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 600000, 
  timeout: 5000 // 5 second timeout
};

Settings.config({
  url: baseUrl+"/pebble/settings"
}, function(e) {
  // Opened
}, function(e) {
  // Closed
  if(e.failed) {
    // Error parsing the saved options
  } else {
    Settings.data('pebbletoken', e.options.token);
    console.log(JSON.stringify(e.options));
  }
});

var token = Settings.data('pebbletoken');

if(token) {
  // Try to get the user's location and wait to query for the options until location is available.
  // If it times out, it'll just use the last known location instead.
  var locatingCard = showLocatingMessage();
  navigator.geolocation.getCurrentPosition(function(pos){
    Settings.data('location', JSON.stringify(pos));
    console.log("found location");
    console.log(pos);
    showTeacupList(locatingCard);
  }, function(err){
    console.log("Error finding location ("+err.code+") "+err.message);
    showTeacupList(locatingCard);
  }, locationOptions);
} else {
  showLoginMessage();
}

function showLoginMessage() {
  // Create a simple Card
  var card = new UI.Card({
    title: 'Please log in',
    body: 'Open the Pebble app on your phone and go to the settings for Teacup.'
  });

  // Display to the user
  card.show();
  
  return card;
}

function showLocatingMessage() {
  var card = new UI.Card({
    title: 'Locating...',
    subtitle: '',
    body: ''
  });

  // Display to the user
  card.show();
  
  return card;
}

function showLoadingMessage(card) {
  card.title('Loading...');
  card.subtitle('');
  card.body('');
  
  return card;
}

function showPostingMessage(entry, card) {
  card.title('Posting...');
  card.subtitle('');
  card.body(entry);

  return card;
}

function showSuccessMessage(entry, card) {
  card.title(entry);
  card.subtitle('Success!');
  card.body('Your entry was posted!');
  
  return card;
}

function showErrorMessage(entry, card) {
  card.title(entry);
  card.subtitle('Error!');
  card.body('There was an error posting the entry.');
  
  return card;
}

function showTeacupList(loadingCard) {

  var loc = null;
  var location_query = '';
  if(Settings.data('location')) {
    console.log("Last known location:");
    console.log(Settings.data('location'));

    loc = JSON.parse(Settings.data('location'));
    location_query = '&latitude='+loc.coords.latitude+'&longitude='+loc.coords.longitude;
  }

  showLoadingMessage(loadingCard);
  
  ajax({
    url: baseUrl+"/pebble/options.json?token="+token+location_query,
    method: 'get',
    type: 'json'
  }, function(data) {

    var options = new UI.Menu(data);
    options.show();

    loadingCard.hide();
    
    options.on('select', function(e) {

      var data = {
        h: 'entry'
      };
      data[e.item.type] = (e.item.value ? e.item.value : e.item.title);
      
      if(Settings.data('location')) {
        var loc = JSON.parse(Settings.data('location'));
        data.location = 'geo:'+loc.coords.latitude+','+loc.coords.longitude+';u='+loc.coords.accuracy;
      }

      options.hide();
      var card = new UI.Card();
      showPostingMessage(e.item.title, card);
      card.show();

      ajax({
        url: baseUrl+"/post",
        method: 'post',
        data: data,
        headers: {
          'Authorization': 'Bearer '+token
        }
      }, function(data){

        Vibe.vibrate('short');
        showSuccessMessage(e.item.title, card);

      }, function(error){
        var card = new UI.Card();
        showErrorMessage(e.item.title, card);

        console.log(error);
      });
    });

  });
}

