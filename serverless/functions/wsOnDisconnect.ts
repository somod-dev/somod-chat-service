import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamodb = new DynamoDBClient();

const WebsocketOnDisconnect: APIGatewayProxyWebsocketHandlerV2 =
  async event => {
    const connectionId = event.requestContext.connectionId;

    await dynamodb.send(
      new DeleteItemCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME + "",
        Key: marshall({ id: connectionId })
      })
    );

    return { statusCode: 200, body: "Disconnected." };
  };

export default WebsocketOnDisconnect;
