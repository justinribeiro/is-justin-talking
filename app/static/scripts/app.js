// The base ref were our subscriptions will be pushed
var firebaseRoot = 'https://is-justin-talking.firebaseio.com/subscriptions';

// This is replaced when we have a subscription
var existingSubscriptionId = 0;

// DOM DOM DOM DOM
var pushMessaging = document.querySelector('platinum-push-messaging');
var togglePush = document.getElementById('togglePush');
var pushStateText = document.getElementById('pushState');

// Do you really need the polyfill?
var webComponentsSupported = ('registerElement' in document
    && 'import' in document.createElement('link')
    && 'content' in document.createElement('template'));

if (!webComponentsSupported) {
  var script = document.createElement('script');
  script.async = true;
  script.src = '/bower_components/webcomponentsjs/webcomponents-lite.min.js';
  document.head.appendChild(script);

  window.addEventListener('WebComponentsReady', function(e) {
    console.log('FALLBACK: WebComponentsReady() fired and components ready.');
    appInit();
  });

} else {
  window.Polymer = window.Polymer || {dom: 'shadow'};

  var link = document.querySelector('#bundle');

  var onImportLoaded = function() {
    console.log('NATIVE: Elements are upgraded!');
    appInit();
  };

  // 5. Go if the async Import loaded quickly. Otherwise wait for it.
  // crbug.com/504944 - readyState never goes to complete until Chrome 46.
  // crbug.com/505279 - Resource Timing API is not available until Chrome 46.
  if (link.import && link.import.readyState === 'complete') {
    onImportLoaded();
  } else {
    link.addEventListener('load', onImportLoaded);
  }
}

function appInit() {

  // Go get the schedule
  ajax('schedule.json', function(err, data) {
    document.querySelector('are-you-talking').schedule = data;
  });

  // Setup base ref for Firebase
  var firebaseRef = new Firebase(firebaseRoot);

  // Check the current state
  togglePush.checked = pushMessaging.enabled;

  if (pushMessaging.subscription && !pushMessaging.subscription.subscriptionId) {
    var endpointSections = pushMessaging.subscription.endpoint.split('/');
    existingSubscriptionId = endpointSections[endpointSections.length - 1];
  } 

  if (pushMessaging.enabled) {
    pushStateText.textContent = 'Disable';
  } else {
    pushStateText.textContent = 'Enable';
  }

  togglePush.addEventListener('change', function() {
    if (togglePush.checked) {
      pushMessaging.enable();
    } else {
      pushMessaging.disable();
    }
  });

  pushMessaging.addEventListener('subscription-changed', function(event) {
    // GCM always needs the subscriptionId passed separately. Note that as of M45,
    // the subscriptionId and the endpoint have merged.
    var subscriptionId = pushMessaging.subscription ? pushMessaging.subscription.subscriptionId : 0;
    
    if (pushMessaging.subscription && !pushMessaging.subscription.subscriptionId) {
      var endpointSections = pushMessaging.subscription.endpoint.split('/');
      subscriptionId = endpointSections[endpointSections.length - 1];
    } 

    console.log('PushMessaging subscription changed, subId: %s', subscriptionId);

    if (subscriptionId) {
      existingSubscriptionId = subscriptionId;
    }

  });

  pushMessaging.addEventListener('enabled-changed', function(event) {

    console.log('PushMessaging state changed: %s', pushMessaging.enabled);

    togglePush.checked = pushMessaging.enabled;

    var subscriptionRef = firebaseRef.child(existingSubscriptionId);
    if (pushMessaging.enabled) {
      subscriptionRef.set({
        subscriptionId: existingSubscriptionId,
        timestamp: Firebase.ServerValue.TIMESTAMP
      });

      pushStateText.textContent = 'Disable';

    } else {
      subscriptionRef.remove();
      console.log('removed record');

      pushStateText.textContent = 'Enable';
    }

  });

}

/**
 * [ajax description]
 * @param  {[type]}   url [description]
 * @param  {Function} cb  [description]
 * @return {[type]}       [description]
 */
function ajax(url, cb) {
  // Native fetch doesn't seem to reuse connections with h2 push
  // so using XHR instead
  var req = new XMLHttpRequest();
  req.addEventListener('load', function() {
    var data;
    var error;
    try {
      data = JSON.parse(this.responseText);
    } catch (err) {
      error = err;
    }
    cb(error, data);
  });
  req.open('GET', '/data/' + url);
  req.send();
}

// GA
//(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
//(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
//m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
//})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
//
//ga('create', '', 'auto'); 
//ga('require', 'linkid', 'linkid.js'); 
