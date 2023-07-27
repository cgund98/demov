<div align="center">

# Demov
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/Amazon_AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
[![Deploy](https://github.com/cgund98/demov/actions/workflows/deploy.yaml/badge.svg)](https://github.com/cgund98/demov/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

_Demov is a simple application that lets you and your friends quickly decide what movie to watch. Hop into a party, pick your genre, and get swiping!_

This repository contains the backend component of the application. For the frontend component, see [here](https://github.com/cgund98/demov-frontend).

<img src="./docs/Swiping.png" alt="swiping" height="600"/>
<img src="./docs/Stats.png" alt="stats" height="600"/>
</div>

## Getting Started

The application runs entirely on AWS, using serverless lambda functions for compute and DynamoDB as the datastore.

It is built and deployed using the CDK.

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

The API should now be successfully deployed.

## Project Structure
```
demov
├── .github -- GitHub Actions workflows
├── bin     -- CDK Entrypoint
├── docs
├── lib     -- CDK Service Stack
├── python  -- Python scripts for sourcing movies from a CSV file
└── src
    ├── data    -- Mappers, repos, and entity definitions
    ├── lambda  -- Lambda function entrypoints
    └── util    -- Additional utilities
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