import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {SSM} from 'aws-sdk';
import jwt from 'jsonwebtoken';
import {v4} from 'uuid';
import Ajv, {JSONSchemaType} from 'ajv';

import {logger} from '../util/logging';
import {httpError} from '../util/errors';
import {JWT_SECRET_SECRET} from '../util/config';

// Initialize clients
const ssm = new SSM();
let secret = '';

// Interfaces
interface Body {
  name: string;
}

// Validate payload
const ajv = new Ajv();
const schema: JSONSchemaType<Body> = {
  type: 'object',
  properties: {
    name: {type: 'string', nullable: false},
  },
  required: ['name'],
  additionalProperties: false,
};
const validate = ajv.compile(schema);

const isJson = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch (err) {
    return false;
  }
};

// Generate User JWT
const generateJWT = (name: string): string => {
  const token = jwt.sign({sub: v4(), name}, secret, {expiresIn: '365 days'});

  return token;
};

// Lambda handler
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  logger.info('Body: ', event.body);

  // Validate request body
  const {body} = event;
  if (body === undefined || !isJson(body) || !validate(JSON.parse(body)))
    return httpError(400, 'Invalid payload.');

  const {name} = JSON.parse(body) as Body;

  // Fetch secret
  if (secret === '') {
    try {
      const data = await ssm
        .getParameter({Name: JWT_SECRET_SECRET, WithDecryption: true})
        .promise();
      secret = data.Parameter?.Value || '';
    } catch (err) {
      logger.error(err);
      return httpError();
    }
  }

  // Generate JWT
  const token = generateJWT(name);

  return {
    statusCode: 200,
    body: JSON.stringify({token}),
  };
};
