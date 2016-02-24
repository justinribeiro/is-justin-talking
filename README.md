# is-justin-talking
Progressive Web App for use with my traveling beacon that offers my slides.

## How it works

* Uses HTTP/2 Push for Google App Engine based on [Chrome http2push-gae](https://github.com/GoogleChrome/http2push-gae)
* Uses Service Worker and Push API via [Polymer Platinum Elements](https://elements.polymer-project.org/browse?package=platinum-elements) `platinum-sw` and `platinum-push-messaging`
* Uses Firebase to store subscriberIds so that you can push messages.
* Deploy to Google App Engine and then assign url to a [Physical Web beacon](https://google.github.io/physical-web/).

## Setup

This app requires the Python App Engine SDK. After downloading, open the App Engine Launcher and let it setup symlinks (it should prompt you).

```shell
➜ git clone git@github.com:justinribeiro/is-justin-talking.git
➜ cd is-justin-talking
➜ npm install && bower install
➜ gulp
➜ dev_appserver.py .
```

Have it running? Now let's setup the moving parts.

## Adding Push Messaging

In `app/static` you'll find `manifest.json` for our web app. In that file, there is an empty field called `gcm_sender_id` which needs to have the project id from a Google Cloud project of your chosing.

To setup your project and get the proper id and api keys, see the [Getting Started guide for Push Notifications for Chrome Web Fundementals, Step 4](https://developers.google.com/web/fundamentals/getting-started/push-notifications/step-04?hl=en).

## Add Firebase endpoint

Log into Firebase and create a new instance that you can use (remember to eventually set your security rules!).

Then open `app/static/scripts/app.js`. Line 2 contains the firebase endpoint where you'll store current subscriptions so that you can latter pull and send message to your subscribers.

```
// The base ref were our subscriptions will be pushed
var firebaseRoot = 'https://YOUR_FB_REF_HERE.firebaseio.com/subscriptions';

// This is replaced when we have a subscription
var existingSubscriptionId = 0;

...
```

Eventually, you'll have data that looks like when users enable notifications:
![Firebase and SubIds](https://i.imgur.com/Eli1HLX.png)

## Defining talks

At the moment, we simply define some JSON in `app/static/data/schedule.json` that looks something like this:

```
[
  {
    "title": "Show me the Context: Beacons, Hints, and You",
    "event": {
      "title": "GDG DevFest 2016 - GDG Kansas City",
      "location": "Kansas City",
      "link": "https://devfest.gdgkc.org/"
    },
    "starttime": "2016-02-20 13:00:00 CST",
    "endtime": "2016-02-20 14:00:00 CST",
    "slidedeck": {
      "link": "https://goo.gl/6ICgb9"
    }
  }
]
```

You can add as many as you want; the custom element `are-you-talking` simply looks for a relevent event happening on the date of access (ala, today) and makes sure to display it as needed. There is some very generic breakpoints in that element that define when to show data.

```
> Today = 'Soon.', no slide URL.
> One hour until talk = 'Almost.', no slide URL.
> Talk started = 'Yes.', slide URL available.
> Up to hour after endtime = 'Done', slide URL available.
> 1hr+ after endtime = 'No.', slide URL available.
```

You can of course change this (and ideas and pull requests are welcome).

The data is define via the property `schedule` with expect and `Array`. In this project, we set it via JavaScript (though you could of course auto bind and be declarative if you like):

```
// Go get the schedule
ajax('schedule.json', function(err, data) {
  document.querySelector('are-you-talking').schedule = data;
});
```

> Why AJAX and not fetch()? Because Chrome and Polymer developer advocate [Rob Dodson](https://twitter.com/rob_dodson) had made a determination that fetch didn't seem to reuse connections with H2 Push. I haven't had time to retest this in latest Chrome, so I kept approach the same.

## Sending data to subscribers

*TODO 2016-02-23* I'm writing this into a form for better interaction with slidedecks like reveal.js. Stay turned!

## Deploying to App Engine

I have a tendency to still use `appcfg.py` for deploys (it's still a little more reliable than the currently beta `gcloud preview app deploy`), so in this project you'll need to change the `app.yaml` first line to your project id:

```
application: YOUR_PROJECT_HERE
version: 0-0-2
runtime: python27
api_version: 1
threadsafe: yes

...
```

After, it's simply a matter of running the deploy:

```
➜ appcfg.py update app.yaml
```