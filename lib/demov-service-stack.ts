/* eslint-disable @typescript-eslint/no-unused-vars */
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sqs from '@aws-cdk/aws-sqs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from '@aws-cdk/aws-s3';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import {SqsEventSource} from '@aws-cdk/aws-lambda-event-sources';
import {PolicyStatement, Effect, ServicePrincipal} from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

export class DemovServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import Secrets
    const omdbToken = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      'imported-omdb-token',
      {
        parameterName: '/dev/omdb-token',
        version: 1,
      },
    );

    // Create s3 bucket
    const bucket = new s3.Bucket(this, 'demov-public', {
      publicReadAccess: true,
    });

    // Create DynamoDB Table
    const table = new dynamodb.Table(this, 'demov-main', {
      partitionKey: {name: 'pk', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'sk', type: dynamodb.AttributeType.STRING},
    });

    table.addLocalSecondaryIndex({
      indexName: 'LSI-1',
      sortKey: {
        name: 'sk2',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // Create SQS queues
    const enrichMoviesSQS = new sqs.Queue(this, 'enrich-movies');
    const createMoviesSQS = new sqs.Queue(this, 'create-movies');

    /** Lambda functions */

    // createMovie
    const createMovieLambda = new NodejsFunction(this, 'create-movie', {
      timeout: cdk.Duration.seconds(30),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/lambda/createMovie.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        DYNAMO_TABLE: table.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const createMovieSqsSource = new SqsEventSource(createMoviesSQS, {
      batchSize: 5,
    });
    createMovieLambda.addEventSource(createMovieSqsSource);

    table.grantReadWriteData(createMovieLambda);

    // enrichMovie
    const enrichMovieLambda = new NodejsFunction(this, 'enrich-movie', {
      timeout: cdk.Duration.seconds(30),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/lambda/enrichMovie.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        BUCKET_NAME: bucket.bucketName,
        SQS_DESTINATION: createMoviesSQS.queueUrl,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const enrichMovieSqsSource = new SqsEventSource(enrichMoviesSQS, {
      batchSize: 5,
    });
    enrichMovieLambda.addEventSource(enrichMovieSqsSource);

    omdbToken.grantRead(enrichMovieLambda);
    bucket.grantReadWrite(enrichMovieLambda);
    createMoviesSQS.grantSendMessages(enrichMovieLambda);
  }
}
