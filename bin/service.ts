#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import {DemovServiceStack} from '../lib/demov-service-stack';

const app = new cdk.App();
new DemovServiceStack(app, 'demov-service-stack', {
  tags: {
    environment: 'dev',
  },
});
