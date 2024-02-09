import { Middleware } from "somod";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2
} from "aws-lambda";
import { UserProviderMiddlewareKey } from "../../../lib";

type InterfaceToRecordConvertor<T> = { [K in keyof T]: T[K] };

/**
 * This Middleware sets the context user in Lambda function integrated for
 *   - HTTP SyncMessage Route  - take value from headers
 *   - HTTP SendMessage Route  - take value from headers
 *   - WebSocket Connect Route - take value from headers
 *   - WebSocket OnMessage Route - take value from body
 *
 * This is a sample implementation, For PROD usecase , derive the value from event.requestContext.authorizer
 */
const userProviderMiddleware: Middleware<
  InterfaceToRecordConvertor<
    APIGatewayProxyEventV2 | APIGatewayProxyWebsocketEventV2
  >,
  APIGatewayProxyResultV2
> = async (next, event) => {
  let key;
  if (event["headers"] !== undefined) {
    key = event["headers"][UserProviderMiddlewareKey];
  } else {
    key = JSON.parse(event.body ?? "{}")?.[UserProviderMiddlewareKey];
  }

  if (key === undefined) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Expected ${UserProviderMiddlewareKey} in the request headers or message body`
      })
    };
  }
  event.somodMiddlewareContext.set(UserProviderMiddlewareKey, key);
  return await next();
};

export default userProviderMiddleware;
