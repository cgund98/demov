/* eslint-disable @typescript-eslint/no-unused-vars */
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sqs from '@aws-cdk/aws-sqs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from '@aws-cdk/aws-s3';
import * as apigateway from '@aws-cdk/aws-apigateway';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import {SqsEventSource} from '@aws-cdk/aws-lambda-event-sources';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

import {envSpecific} from '../src/util/environ';

export class DemovServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** Secrets  */
    const omdbToken = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      'imported-omdb-token',
      {
        parameterName: '/dev/omdb-token',
        version: 1,
      },
    );

    /** S3 Bucket  */
    const bucket = new s3.Bucket(this, envSpecific('demov-public'), {
      publicReadAccess: true,
    });

    /** DynamoDB Tables */

    const table = new dynamodb.Table(this, 'demov-base', {
      partitionKey: {name: 'pk', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'sk', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI-1',
      partitionKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk2',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    /** SQS Queues */

    const enrichMoviesSQS = new sqs.Queue(this, 'enrich-movies');
    const createMoviesSQS = new sqs.Queue(this, 'create-movies');

    /** API Gateway  */
    const api = new apigateway.RestApi(this, 'demov-api', {
      description: 'Primary API gateway for demov application',
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
      },
    });

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

    // getMovieById
    const getMovieLambda = new NodejsFunction(this, 'get-movie', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'movieIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        DYNAMO_TABLE: table.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    table.grantReadData(getMovieLambda);

    // getMovieByImdbId
    const getMovieImdbLambda = new NodejsFunction(this, 'get-movie-imdb', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'imdbIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        DYNAMO_TABLE: table.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    table.grantReadData(getMovieImdbLambda);

    // createMovieGroup
    const createMovieGroupsLambda = new NodejsFunction(
      this,
      'create-movie-groups',
      {
        timeout: cdk.Duration.seconds(60),
        memorySize: 512,
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'handler',
        entry: path.join(__dirname, `/../src/lambda/createMovieGroups.ts`),
        bundling: {
          minify: true,
          externalModules: ['aws-sdk'],
        },
        environment: {
          DYNAMO_TABLE: table.tableName,
        },
        tracing: lambda.Tracing.ACTIVE,
      },
    );

    table.grantReadWriteData(createMovieGroupsLambda);

    // getMovieByImdbId
    const getMovieGroupLambda = new NodejsFunction(this, 'get-movie-group', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/lambda/getMovieGroup.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        DYNAMO_TABLE: table.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    table.grantReadData(getMovieGroupLambda);

    // Integrate lambdas with Lambda
    const movies = api.root.addResource('movies');
    const movie = movies.addResource('{movieId}');
    movie.addMethod('GET', new apigateway.LambdaIntegration(getMovieLambda));

    const imdbs = api.root.addResource('imdb');
    const imdb = imdbs.addResource('{imdbId}');
    imdb.addMethod('GET', new apigateway.LambdaIntegration(getMovieImdbLambda));

    const groups = api.root.addResource('groups');
    const movieGroups = groups.addResource('movies');
    movieGroups.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getMovieGroupLambda),
    );
  }
}
