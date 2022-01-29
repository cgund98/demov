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
      },
    );

    const jwtSecret = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      'imported-jwt-secret',
      {
        parameterName: '/dev/jwt-secret',
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

    const commonLambda = {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        DYNAMO_TABLE: table.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    };

    // createMovie
    const createMovieLambda = new NodejsFunction(this, 'create-movie', {
      ...commonLambda,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, `/../src/lambda/createMovie.ts`),
    });

    const createMovieSqsSource = new SqsEventSource(createMoviesSQS, {
      batchSize: 5,
    });
    createMovieLambda.addEventSource(createMovieSqsSource);

    table.grantReadWriteData(createMovieLambda);

    // enrichMovie
    const enrichMovieLambda = new NodejsFunction(this, 'enrich-movie', {
      ...commonLambda,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, `/../src/lambda/enrichMovie.ts`),
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
      ...commonLambda,
      handler: 'movieIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
    });

    table.grantReadData(getMovieLambda);

    // getMovieByImdbId
    const getMovieImdbLambda = new NodejsFunction(this, 'get-movie-imdb', {
      ...commonLambda,
      handler: 'imdbIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
    });

    table.grantReadData(getMovieImdbLambda);

    // createMovieGroup
    const createMovieGroupsLambda = new NodejsFunction(
      this,
      'create-movie-groups',
      {
        ...commonLambda,
        timeout: cdk.Duration.seconds(60),
        memorySize: 512,
        entry: path.join(__dirname, `/../src/lambda/createMovieGroups.ts`),
      },
    );

    table.grantReadWriteData(createMovieGroupsLambda);

    // getMovieByImdbId
    const getMovieGroupLambda = new NodejsFunction(this, 'get-movie-group', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/getMovieGroup.ts`),
    });

    // login
    const loginLambda = new NodejsFunction(this, 'login-lm', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/login.ts`),
    });

    jwtSecret.grantRead(loginLambda);

    // createParty
    const createPartyLambda = new NodejsFunction(this, 'create-party', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/createParty.ts`),
    });

    jwtSecret.grantRead(createPartyLambda);
    table.grantReadWriteData(createPartyLambda);

    // getPartyMembers
    const getPartyMembers = new NodejsFunction(this, 'get-party-members', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/getPartyMembers.ts`),
    });

    jwtSecret.grantRead(getPartyMembers);
    table.grantReadData(getPartyMembers);

    // getPartyMovies
    const getPartyMovies = new NodejsFunction(this, 'get-party-movies', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/getPartyMovies.ts`),
    });

    jwtSecret.grantRead(getPartyMovies);
    table.grantReadData(getPartyMovies);

    // getParty
    const getParty = new NodejsFunction(this, 'get-party', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/getParty.ts`),
    });

    jwtSecret.grantRead(getParty);
    table.grantReadData(getParty);

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

    const login = api.root.addResource('login');
    login.addMethod('POST', new apigateway.LambdaIntegration(loginLambda));

    const parties = api.root.addResource('parties');
    parties.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createPartyLambda),
    );
    const party = parties.addResource('{partyId}');
    party.addMethod('GET', new apigateway.LambdaIntegration(getParty));

    const partyMembers = party.addResource('members');
    partyMembers.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPartyMembers),
    );

    const partyMovies = party.addResource('movies');
    partyMovies.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPartyMovies),
    );
  }
}
