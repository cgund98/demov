import {APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2} from 'aws-lambda';
import {SSM} from 'aws-sdk';
import jwt from 'jsonwebtoken';
import {v4} from 'uuid';
import Ajv, {JSONSchemaType} from 'ajv';

import {logger} from '../util/logging';
import {HttpError, httpError} from '../util/errors';
import {JWT_SECRET_SECRET} from '../util/config';
import {decodeB64} from '../util/base64';
import BadRequest from '../util/errors/badRequest';

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
  logger.debug(`Body: ${event.body || ''}`);

  try {
    // Validate request body
    const body = event.isBase64Encoded ? decodeB64(event.body || '') : event.body;
    if (body === undefined) throw new BadRequest('No request body given.');
    if (!isJson(body)) throw new BadRequest('Request body does not appear to be valid JSON');
    if (!validate(JSON.parse(body)))
      throw new BadRequest(`Invalid payload: ${validate.errors ? JSON.stringify(validate.errors) : ''}`);

    const {name} = JSON.parse(body) as Body;

    // Fetch secret
    if (secret === '') {
      try {
        const data = await ssm.getParameter({Name: JWT_SECRET_SECRET, WithDecryption: true}).promise();
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
  } catch (err) {
    if (err instanceof HttpError) {
      return err.serialize();
    }

    logger.error(err);
    return httpError();
  }
};
