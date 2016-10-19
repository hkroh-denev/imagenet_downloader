/* ImageNet downloader 
 * 
 * NodeJS version
 * 
 * */

var http = require('http');
var https = require('https');
var fs = require('fs');

var config = require('./config.json');

var downloadCounter = 0;

var download = function(url, dest, callback) {

    var file = fs.createWriteStream(dest);
    var responseFunction = function(response) {
      if (response.statusCode != 200) {
        file.close();
        fs.unlink(dest);
        if (callback)
        {
          return callback('Response status was ' + response.statusCode + ' for ' + dest);
        }
      }

      response.pipe(file);

      file.on('finish', function() {
        file.close(callback);
        //callback('Download OK ' + dest);
      })
    };
    
    if (config.logLevel >= 2)
      console.log('Download: ' + url + ' to ' + dest);

    var request;
    if (url.substring(0, 5) == 'https')
      request = https.get(url, responseFunction);
    else
      request = http.get(url, responseFunction);
    
    request.setSocketKeepAlive(false);

    request.setTimeout(15000, function() {
      request.abort();  // error will occur and close file in 'error'
    });

    request.on('error', function(err) {
      file.close();
      fs.unlink(dest);
      if (callback)
        return callback(err.message + ' for ' + dest);
    });

    file.on('error', function(err) {
      file.end();
      fs.unlink(dest);
      if (callback)
        return callback(err.message + ' for ' + dest);
    });
}

var remaining = '';

function parseLine(func) {
    var index = remaining.indexOf('\n');
    if (index > 0)
    {
      var line = remaining.substring(0, index);
      remaining = remaining.substring(index+1);
      func(line);
    }
    else
      input.resume();
}

var readline = function(input, func) {

    input.on('data', function(data) {
      input.pause();
      remaining += data;
      parseLine(func);
    });

    input.on('end', function() {
      if (remaining.length > 0)
        func(remaining);
    });
}

function downloadCallback(message)
{
  if (message) {
	if (config.logLevel >= 1)
		console.log(message);
  }
  downloadCounter++;
  setTimeout(function() { parseLine(processLine); }, 100);
}

function downloadSkip()
{
	setTimeout(function() { parseLine(processLine); }, 1);
}

function processLine(data)
{
  var index = data.indexOf('\t');
  if (index < 0)
    index = data.indexOf(' ');
  var imageId = data.substring(0, index);
  var imageUrl = data.substring(index+1);
  var ext = '.jpg';
  var extIndex = imageUrl.lastIndexOf('.');
  if (extIndex > 0)
  {
    ext = imageUrl.substring(extIndex).toLowerCase();
    if (ext != '.gif' && ext != '.png' && ext != '.tif' && ext != '.bmp')
      ext = '.jpg';
  }
  var imageFile = config.outputPath + '/' + imageId + ext;

  if (!fs.existsSync(imageFile))
    download(imageUrl, imageFile, downloadCallback);
  else {
	  downloadSkip();
	  if (config.logLevel >= 2)
	    console.log("Download skip: " + imageFile); 
	}
}

var input = fs.createReadStream(config.inputFile);
readline(input, processLine);
