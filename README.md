# Test SNS (NodeJS)

## Introduction
A very basic example of using an AWS SNS topic.

## Pre-requsites
* Create your SNS Topic
* Create your SQS Queues (to subscribe to the SNS topic)


## Configuration
* Copy aws.credentials.sample.json to aws.credentials.json
* Add your credentials to aws.credentials.json
* Copy aws.config.sample.json to aws.config.json
* Configure aws.config.json with your SNS topic ARN

## Run
* ```npm install```
* ```npm run pub```
* ```npm run sub <SQS-URL>```
