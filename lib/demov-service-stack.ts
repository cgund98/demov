import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sqs from '@aws-cdk/aws-sqs';
import * as ssm from '@aws-cdk/aws-ssm';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as apigateway from '@aws-cdk/aws-apigateway';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import {SqsEventSource} from '@aws-cdk/aws-lambda-event-sources';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

import {deployEnv, envSpecific} from '../src/util/environ';

export class DemovServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** Secrets  */
    const omdbToken = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'imported-omdb-token', {
      parameterName: '/dev/omdb-token',
    });

    const jwtSecret = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'imported-jwt-secret', {
      parameterName: '/dev/jwt-secret',
    });

    /** S3 Bucket  */
    const bucket = new s3.Bucket(this, envSpecific('demov-public'), {
      publicReadAccess: true,
    });

    const executeRole = new iam.Role(this, 'role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      path: '/service-role/',
    });
    bucket.grantReadWrite(executeRole);

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

    new cdk.CfnOutput(this, envSpecific('enrichmentSqsQueue'), {
      value: enrichMoviesSQS.queueUrl,
      description: 'The URl of the movie enrichment SQS queue',
      exportName: envSpecific('enrichmentSqsQueue'),
    });

    /** API Gateway  */
    const api = new apigateway.RestApi(this, envSpecific('demov-api'), {
      description: 'Primary API gateway for demov application',
      deployOptions: {
        stageName: 'api',
        tracingEnabled: true,
        dataTraceEnabled: true,
      },
      binaryMediaTypes: ['*/*'],
    });

    const cert = acm.Certificate.fromCertificateArn(
      this,
      'cert',
      'arn:aws:acm:us-east-2:178852309825:certificate/cd5cedef-1b11-4f05-bc76-f0010d43da57',
    );

    const domain = new apigateway.DomainName(this, 'domain-name', {
      domainName: `api-${deployEnv()}.demov.app`,
      certificate: cert,
    });
    domain.addBasePathMapping(api, {stage: api.deploymentStage});

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
        LOG_LEVEL: 'debug',
      },
      tracing: lambda.Tracing.ACTIVE,
    };

    // createMovie
    const createMovie = new NodejsFunction(this, 'create-movie', {
      ...commonLambda,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, `/../src/lambda/createMovie.ts`),
    });

    const createMovieSqsSource = new SqsEventSource(createMoviesSQS, {
      batchSize: 5,
    });
    createMovie.addEventSource(createMovieSqsSource);

    table.grantReadWriteData(createMovie);

    // enrichMovie
    const enrichMovie = new NodejsFunction(this, 'enrich-movie', {
      ...commonLambda,
      environment: {
        ...commonLambda.environment,
        BUCKET_NAME: bucket.bucketName,
        SQS_DESTINATION: createMoviesSQS.queueUrl,
      },
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, `/../src/lambda/enrichMovie.ts`),
    });

    const enrichMovieSqsSource = new SqsEventSource(enrichMoviesSQS, {
      batchSize: 5,
    });
    enrichMovie.addEventSource(enrichMovieSqsSource);

    omdbToken.grantRead(enrichMovie);
    bucket.grantReadWrite(enrichMovie);
    createMoviesSQS.grantSendMessages(enrichMovie);

    // getMovieById
    const getMovie = new NodejsFunction(this, 'get-movie', {
      ...commonLambda,
      handler: 'movieIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
    });

    table.grantReadData(getMovie);

    // getMovieByImdbId
    const getMovieImdb = new NodejsFunction(this, 'get-movie-imdb', {
      ...commonLambda,
      handler: 'imdbIdHandler',
      entry: path.join(__dirname, `/../src/lambda/getMovie.ts`),
    });

    table.grantReadData(getMovieImdb);

    // createMovieGroup
    const createMovieGroupsLambda = new NodejsFunction(this, 'create-movie-groups', {
      ...commonLambda,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      entry: path.join(__dirname, `/../src/lambda/createMovieGroups.ts`),
    });

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

    // startParty
    const startParty = new NodejsFunction(this, 'start-party', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/startParty.ts`),
    });

    jwtSecret.grantRead(startParty);
    table.grantReadWriteData(startParty);

    // deleteParty
    const deleteParty = new NodejsFunction(this, 'delete-party', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/deleteParty.ts`),
    });

    jwtSecret.grantRead(deleteParty);
    table.grantReadWriteData(deleteParty);

    // votePartyMovie
    const votePartyMovie = new NodejsFunction(this, 'vote-party-movie', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/votePartyMovie.ts`),
    });

    jwtSecret.grantRead(votePartyMovie);
    table.grantReadWriteData(votePartyMovie);

    // createPartyMember
    const createPartyMember = new NodejsFunction(this, 'create-party-member', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/createPartyMember.ts`),
    });

    jwtSecret.grantRead(createPartyMember);
    table.grantReadWriteData(createPartyMember);

    // deletePartyMember
    const deletePartyMember = new NodejsFunction(this, 'delete-party-member', {
      ...commonLambda,
      entry: path.join(__dirname, `/../src/lambda/deletePartyMember.ts`),
    });

    jwtSecret.grantRead(deletePartyMember);
    table.grantReadWriteData(deletePartyMember);

    /** Integrate lambdas with Lambda */

    // Movies
    const v1 = api.root.addResource('v1');
    const movies = v1.addResource('movies');
    const movie = movies.addResource('{movieId}');
    movie.addMethod('GET', new apigateway.LambdaIntegration(getMovie));

    const imdbs = v1.addResource('imdb');
    const imdb = imdbs.addResource('{imdbId}');
    imdb.addMethod('GET', new apigateway.LambdaIntegration(getMovieImdb));

    const groups = v1.addResource('groups');
    const movieGroups = groups.addResource('movies');
    movieGroups.addMethod('GET', new apigateway.LambdaIntegration(getMovieGroupLambda));

    // Authentication
    const login = v1.addResource('login');
    login.addMethod('POST', new apigateway.LambdaIntegration(loginLambda));

    // Parties
    const parties = v1.addResource('parties');
    parties.addMethod('POST', new apigateway.LambdaIntegration(createPartyLambda));
    const party = parties.addResource('{partyId}');
    party.addMethod('GET', new apigateway.LambdaIntegration(getParty));
    party.addMethod('PUT', new apigateway.LambdaIntegration(startParty));
    party.addMethod('DELETE', new apigateway.LambdaIntegration(deleteParty));

    // Party members
    const partyMembers = party.addResource('members');
    partyMembers.addMethod('GET', new apigateway.LambdaIntegration(getPartyMembers));
    partyMembers.addMethod('POST', new apigateway.LambdaIntegration(createPartyMember));

    // Delete member
    const partyMember = partyMembers.addResource('{memberId}');
    partyMember.addMethod('DELETE', new apigateway.LambdaIntegration(deletePartyMember));

    // Party movies
    const partyMovies = party.addResource('movies');
    partyMovies.addMethod('GET', new apigateway.LambdaIntegration(getPartyMovies));

    const partyMovie = partyMovies.addResource('{movieId}');
    partyMovie.addMethod('PUT', new apigateway.LambdaIntegration(votePartyMovie));

    // Join party by code
    const join = v1.addResource('join');
    const code = join.addResource('{joinCode}');
    code.addMethod('POST', new apigateway.LambdaIntegration(createPartyMember));

    // Proxy image requests to S3
    const images = v1.addResource('images');
    const imageFolder = images.addResource('{folder}');
    const imageKey = imageFolder.addResource('{key}');

    const s3Integration = new apigateway.AwsIntegration({
      service: 's3',
      path: `${bucket.bucketName}/images/{folder}/{key}`,
      integrationHttpMethod: 'GET',
      options: {
        credentialsRole: executeRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': 'integration.response.header.Content-Type',
            },
          },
        ],
        requestParameters: {
          'integration.request.path.key': 'method.request.path.key',
          'integration.request.path.folder': 'method.request.path.folder',
        },
      },
    });

    imageKey.addMethod('GET', s3Integration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
      requestParameters: {
        'method.request.path.folder': true,
        'method.request.path.key': true,
        'method.request.header.Content-Type': true,
      },
    });
  }
}
