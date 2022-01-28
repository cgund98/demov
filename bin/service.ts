#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import {DemovServiceStack} from '../lib/demov-service-stack';
import {envSpecific} from '../src/util/env';

const app = new cdk.App();
new DemovServiceStack(app, envSpecific('demov-service-stack'), {
  tags: {
    environment: 'dev',
  },
});
