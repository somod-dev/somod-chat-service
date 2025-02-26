import {
  APIGatewayProxyEventV2,
  APIGatewayProxyWebsocketEventV2
} from "aws-lambda";
import { EventWithMiddlewareContext } from "somod";
import { UserProviderMiddlewareKey } from "./constants";

// get User Id from Event
export const getUserIdFromEvent = (
  event: APIGatewayProxyEventV2 | APIGatewayProxyWebsocketEventV2
) => {
  return (
    event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
  ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;
};
