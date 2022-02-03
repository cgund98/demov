import {APIGatewayProxyEventV2} from 'aws-lambda';
import jwt from 'jsonwebtoken';
import {SSM} from 'aws-sdk';

import {NotAuthenticated} from './errors';
import {JWT_SECRET_SECRET} from './config';

export interface JwtPayload {
  sub: string;
  name: string;
}

// Initialize clients
const ssm = new SSM();
let secret = '';

/**
 * Check that a request has a valid JWT
 *
 * @param event API Gateway event that triggers the lambda function
 */
export const checkJwt = async (event: APIGatewayProxyEventV2): Promise<JwtPayload> => {
  // Parse token
  const token = event.headers.Authorization?.split(' ')[1] || '';
  if (token === '') throw new NotAuthenticated();

  // Pull secret if not yet done
  if (secret === '') {
    const data = await ssm.getParameter({Name: JWT_SECRET_SECRET, WithDecryption: true}).promise();
    secret = data.Parameter?.Value || '';
  }

  // Validate jwt
  try {
    const user = jwt.verify(token, secret) as JwtPayload;
    return user;
  } catch (err) {
    throw new NotAuthenticated();
  }
};
