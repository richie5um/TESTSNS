'use strict';

var _ = require('lodash');
var AWS = require('aws-sdk');
var FS = require('fs');
var Promise = require('bluebird');

var awsCredentialsPath = './aws.credentials.json';
var awsConfigPath = './aws.config.json';

AWS.config.loadFromPath(awsCredentialsPath);
var sns = new AWS.SNS();
var sqs = new AWS.SQS();

var awsConfig = JSON.parse(FS.readFileSync(awsConfigPath));

if (3 <= process.argv.length) {
    switch (process.argv[2]) {
        case 'pub':
            publishMessage({ hello: 'world' });
            break;
        case 'sub':
            listener(process.argv[3]);
            break;
    }
}

function publishMessage(message) {
    return new Promise(function (resolve, reject) {
        sns.publish({
            TopicArn: awsConfig.snsTopicARN,
            Message: JSON.stringify({
                default: JSON.stringify(message),
                sqs: JSON.stringify(message)
            })
        }, function (err, data) {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
};

function receiveMessages(sqsQueueUrl, options) {
    var defaultOptions = {
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 60,
        WaitTimeSeconds: 20
    };

    options = _.merge(defaultOptions, options);

    return new Promise(function (resolve, reject) {
        sqs.receiveMessage({
            QueueUrl: sqsQueueUrl,
            MaxNumberOfMessages: options.MaxNumberOfMessages,
            VisibilityTimeout: options.VisibilityTimeout,
            WaitTimeSeconds: options.WaitTimeSeconds
        }, function (err, data) {
            if (err) {
                return reject(err);
            }

            if (!data.Messages) {
                data.Messages = []
            }
            console.log("Received:", data.Messages.length);
            return resolve(data);
        });
    });
}

function logMessage(sqsQueueUrl, message) {
    return new Promise(function (resolve, reject) {
        var body = JSON.parse(message.Body);
        if (body.Message) {
            console.log(body.Message);
        } else {
            console.log(body);
        }
        return resolve(body);
    });
};

function deleteMessage(sqsQueueUrl, message) {
    return new Promise(function (resolve, reject) {
        console.log("Deleting: ", message.ReceiptHandle);
        sqs.deleteMessage({
            QueueUrl: sqsQueueUrl,
            ReceiptHandle: message.ReceiptHandle
        }, function (err, data) {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
};

function listener(sqsQueueUrl) {
    sqsQueueUrl = sqsQueueUrl || awsConfig.sqsQueueUrl;

    return receiveMessages(sqsQueueUrl, { MaxNumberOfMessages: 3 }).then(function (data) {
        return Promise.all(data.Messages.map(function (message) {
            var origMessage = message;
            return logMessage(sqsQueueUrl, message).catch(function (err) {
                console.log(err);
            }).finally(function () {
                return deleteMessage(sqsQueueUrl, origMessage);
            });
        })).finally(function () {
            listener(sqsQueueUrl);
        }).catch(function (err) {
            console.log(err);
        });
    });
};
