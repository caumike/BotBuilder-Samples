var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request = require('request-promise').defaults({ encoding: null });

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Bot dialog
bot.dialog('/', function (session) {

    var msg = session.message;
    if (msg.attachments.length) {

        // Message with attachment, proceed to download it.
        // Skype attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
        var attachment = msg.attachments[0];
        var fileDownload = isSkypeMessage(msg)
            ? requestWithToken(attachment.contentUrl)
            : request(attachment.contentUrl);

        fileDownload.then(
            function (response) {

                // Send reply with attachment type & size
                var reply = new builder.Message(session)
                    .text('Attachment of %s type and size of %s bytes received.', attachment.contentType, response.length);
                session.send(reply);

            }).catch(function (err) {
                console.log('Error downloading attachment:', { statusCode: err.statusCode, message: err.response.statusMessage });
            });

    } else {

        // No attachments were sent
        var reply = new builder.Message(session)
            .text('Hi there! This sample is intented to show how can I receive attachments but no attachment was sent to me. Please try again sending a new message with an attachment.');
        session.send(reply);
    }

});

// Request file with Authentication Header
var requestWithToken = function (url) {
    return obtainToken().then(function (token) {
        return request({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var isSkypeMessage = function (message) {
    return message.source === 'skype';
};