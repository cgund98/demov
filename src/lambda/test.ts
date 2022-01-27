/* eslint-disable @typescript-eslint/require-await */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Handler,
} from 'aws-lambda';

export const testHandler: Handler<
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
> = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log(`Message received. ${event.rawPath}`);

  return {
    body: JSON.stringify({message: 'Successful lambda invocation'}),
    statusCode: 200,
  };
};
