#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import {DemovServiceStack} from '../lib/demov-service-stack';
import {envSpecific} from '../src/util/environ';

const four = 4;

const app = new cdk.App();
new DemovServiceStack(app, envSpecific('demov-service-stack'), {
  tags: {
    environment: 'dev',
  },
});
