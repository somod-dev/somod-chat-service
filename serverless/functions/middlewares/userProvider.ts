import { Middleware } from "somod";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { UserProviderMiddlewareKey } from "../../../lib";

type InterfaceToRecordConvertor<T> = { [K in keyof T]: T[K] };

const userProviderMiddleware: Middleware<
  InterfaceToRecordConvertor<APIGatewayProxyEventV2>,
  APIGatewayProxyResultV2
> = async (next, event) => {
  const key = event.headers[UserProviderMiddlewareKey];
  if (key === undefined) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Expected ${UserProviderMiddlewareKey} in the request headers`
      })
    };
  }
  event.somodMiddlewareContext.set(UserProviderMiddlewareKey, key);
  return await next();
};

export default userProviderMiddleware;
