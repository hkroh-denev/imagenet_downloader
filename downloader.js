/* ImageNet downloader */

var http = require('http');
var https = require('https');
var fs = require('fs');

var downloadCounter = 0;

var download = function(url, dest, callback) {

    var file = fs.createWriteStream(dest);
    var responseFunction = function(response) {
      if (response.statusCode != 200) {
        file.close();
        //fs.unlink(dest);
        if (callback)
        {
          return callback('Response status was ' + response.statusCode + ' for ' + dest);
        }
      }

      response.pipe(file);

      file.on('finish', function() {
        file.close(callback);
      })
    };

    var request;
    if (url.substring(0, 5) == 'https')
      request = https.get(url, responseFunction);
    else
      request = http.get(url, responseFunction);

    request.setTimeout(15000, function() {
      request.abort();  // error will occur and close file
      if (callback)
        return callback('Request timeout for ' + dest);
    });

    request.on('error', function(err) {
      file.close();
      //fs.unlink(dest);
      if (callback)
        return callback(err.message + ' for ' + dest);
    });

    file.on('error', function(err) {
      file.close();
      //fs.unlink(dest);
      if (callback)
        return callback(err.message + ' for ' + dest);
    });
}

var remaining = '';

var readline = function(input, func) {

    input.on('data', function(data) {
      remaining += data;
      var index = remaining.indexOf('\n');
      if (index > 0)
      {
        var line = remaining.substring(0, index);
        remaining = remaining.substring(index+1);
        input.pause();
        func(line);
      }
    });

    input.on('end', function() {
      if (remaining.length > 0)
        func(remaining);
    });
}

function downloadCallback(message)
{
  if (message)
    console.log(message);
  downloadCounter++;
  input.resume();
}

function downloadSkip()
{
  //console.log('skip');
  input.resume();
}

function processLine(data)
{
  var index = data.indexOf(' ');
  if (index < 0)
    index = data.indexOf('\t');
  var imageId = data.substring(0, index);
  var imageUrl = data.substring(index+1);
  var ext = '.jpg';
  var extIndex = imageUrl.lastIndexOf('.');
  if (extIndex > 0)
  {
    ext = imageUrl.substring(extIndex).toLowerCase();
    if (ext != '.gif' && ext != '.png')
      ext = '.jpg';
  }
  var imageFile = imageId + ext;

  if (!fs.existsSync(imageFile))
    download(imageUrl, imageFile, downloadCallback);
  else
    downloadSkip();
}

var input = fs.createReadStream('../fall11_urls.txt');
readline(input, processLine);
