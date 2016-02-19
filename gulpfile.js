/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

var gulp = require('gulp');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var del = require('del');
var vulcanize = require('gulp-vulcanize');
var merge = require('merge-stream');
var glob = require('glob');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var minifyHTML = require('gulp-minify-html');
var minifyInline = require('gulp-minify-inline');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var jpegtran = require('imagemin-jpegtran');

var packageJson = require('./package.json');

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('copy', ['clean'], function() {
  var app = gulp.src([
    'app/static/**/*',
    '!app/static/images/**/*',
    '!app/static/index.html',
    '!app/static/scripts/**/*',
    '!app/static/elements/**/*',
    '!app/static/bower_components/**/*'
  ])
  .pipe(gulp.dest('dist/static'));

  var bower = gulp.src([
    'app/static/bower_components/{webcomponentsjs,platinum-sw,sw-toolbox,promise-polyfill,firebase}/**/*'
  ])
  .pipe(gulp.dest('dist/static/bower_components'));

  return merge(app, bower);
});

gulp.task('html:js:dev', ['clean'], function() {
  return gulp.src('app/static/index.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify({mangle: false, compress: {
         drop_console: false
    }})))
    .pipe(gulp.dest('tmp/static'))
    .pipe(gulp.dest('dist/static'));
});

gulp.task('html:js', ['clean'], function() {
  return gulp.src('app/static/index.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify({compress: {
         drop_console: false
    }})))
    .pipe(gulp.dest('tmp/static'))
    .pipe(gulp.dest('dist/static'));
});

gulp.task('images:min', ['clean'], function() {
  return gulp.src('app/static/images/**/*')
    .pipe(imagemin({
      progressive: true,
      use: [pngquant(), jpegtran()]
    }))
    .pipe(gulp.dest('dist/static/images'));
});

gulp.task('html:compress', ['html:js'], function() {
  return gulp.src('tmp/static/index.html')
    .pipe(useref())
    .pipe(minifyHTML())
    .pipe(gulp.dest('dist/static'));
});

gulp.task('vulcanize', ['copy'], function() {
  return gulp.src('app/static/elements/elements.html')
    .pipe(vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true,
      excludes: [path.resolve('./app/static/bower_components/firebase/firebase.js')]
    }))
    .pipe(minifyInline())
    .pipe(minifyHTML())
    .pipe(gulp.dest('dist/static/elements'));
});

gulp.task('cache-config', ['copy', 'html:js', 'html:compress', 'images:min', 'vulcanize'], function(callback) {
  var dir = 'dist/static';
  var config = {
    cacheId: packageJson.name,
    disabled: false
  };

  glob('{data,scripts,images}/**/*.*', {cwd: dir}, function(error, files) {
    if (error) {
      callback(error);
    } else {
      files.push(
        '/',
        'bower_components/webcomponentsjs/webcomponents-lite.min.js',
        'script/app.js',
        'elements/elements.html'
      );
      config.precache = files;

      var md5 = crypto.createHash('md5');
      md5.update(JSON.stringify(config.precache));
      config.precacheFingerprint = md5.digest('hex');

      var configPath = path.join(dir, 'cache-config.json');
      fs.writeFile(configPath, JSON.stringify(config), callback);
    }
  });
});

gulp.task('watch', ['dev'], function() {
  gulp.watch([
    'app/static/index.html',
    'app/static/favicon.ico',
    'app/static/{data,scripts,elements,styles}/**/*'
  ], ['dev']);
});

gulp.task('deploy:gae', ['default'], function() {
  exec('appcfg.py update app.yaml', function(err, stdout, stderr) {
    if (err) {
      console.log('Child process exited with error code', err.code);
      return;
    }
    console.log(stdout);
    console.log(stderr);
  });
});

gulp.task('dev', ['clean', 'html:js:dev', 'images:min', 'vulcanize']);

gulp.task('default', ['clean', 'html:js', 'html:compress', 'images:min', 'vulcanize', 'cache-config']);

gulp.task('deploy', ['default', 'deploy:gae']);
