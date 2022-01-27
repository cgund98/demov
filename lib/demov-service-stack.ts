/* eslint-disable @typescript-eslint/no-unused-vars */
import * as lambda from '@aws-cdk/aws-lambda';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

export class DemovServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const testLambda = new NodejsFunction(this, 'test-function', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'testHandler',
      entry: path.join(__dirname, `/../src/lambda/test.ts`),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
    });
  }
}
