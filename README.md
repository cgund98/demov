# demov
[![Deploy](https://github.com/cgund98/demov/actions/workflows/deploy.yaml/badge.svg)](https://github.com/cgund98/demov/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

App designed to make deciding what to watch much easier. 

The application runs entirely on AWS, using serverless lambda functions for compute and DynamoDB as our primary state store. It is built and deployed using the CDK.

## Getting Started

### Pre-requisites
* Install Node.js verson 14.X

### Installation
1. Install NPM dependencies
```bash
npm install
```

2. Configure AWS environment
```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCES_KEY=...
```

3. (Optional) Configure deployment environment.  Defaults to `dev`
```bash
export DEPLOYMENT=nonprod
```

4. Build and launch application
```bash
npx cdk synth
npx cdk deploy
```

## Housekeeping

### Linting
ESLint is the linting tool of choice. It should be installed by with the rest of the packages by `npm`.

Lint the codebase:
```bash
npm run lint
```

### Formatting
Prettier is the formatting tool used. It will also be install by default with `npm`.

Format all files in codebase:
```bash
npm run prettier-format
```