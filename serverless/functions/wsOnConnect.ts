import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { EventWithMiddlewareContext } from "somod";
import { UserProviderMiddlewareKey } from "../../lib";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamodb = new DynamoDBClient();

const WebsocketOnConnect: APIGatewayProxyWebsocketHandlerV2 = async event => {
  const userId = (
    event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
  ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;

  const connectionId = event.requestContext.connectionId;

  await dynamodb.send(
    new PutItemCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME + "",
      Item: marshall({ id: connectionId, userId: userId })
    })
  );

  return { statusCode: 200, body: "Connected." };
};

export default WebsocketOnConnect;
