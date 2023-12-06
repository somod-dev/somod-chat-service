import { SNSHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { convertToAttr, unmarshall } from "@aws-sdk/util-dynamodb";
import { Message } from "../../lib";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const dynamodb = new DynamoDBClient();
const apiGwManagementApi = new ApiGatewayManagementApiClient({
  endpoint: process.env.CONNECTIONS_ENDPOINT
});

const notifyMessage = async (connectionId: string, message: Message) => {
  const data = JSON.stringify(message);

  try {
    await apiGwManagementApi.send(
      new PostToConnectionCommand({ ConnectionId: connectionId, Data: data })
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const WebsocketNotifyMessage: SNSHandler = async event => {
  const userId = event.Records[0]?.Sns.MessageAttributes["userId"]?.Value;
  const message = JSON.parse(event.Records[0]?.Sns.Message) as Message;

  if (userId && message) {
    const connections = await dynamodb.send(
      new QueryCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME + "",
        IndexName: "ByUserId",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: {
          "#userId": "userId"
        },
        ExpressionAttributeValues: {
          ":userId": convertToAttr(userId)
        }
      })
    );

    await Promise.all(
      (connections.Items || []).map(async item => {
        const conn = unmarshall(item) as { id: string };
        await notifyMessage(conn.id, message);
      })
    );
  }
};

export default WebsocketNotifyMessage;
