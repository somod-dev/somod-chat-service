import { RouteBuilder, RouteHandler } from "somod-http-extension";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand
} from "@aws-sdk/client-dynamodb";
import { Thread, ThreadInput } from "../../lib";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v1 as v1uuid } from "uuid";

const builder = new RouteBuilder();

const dynamodb = new DynamoDBClient();

const createThread: RouteHandler<ThreadInput> = async request => {
  const thread: Thread = { ...request.body, id: v1uuid().split("-").join("") };
  const putItemCommand = new PutItemCommand({
    TableName: process.env.THREAD_TABLE_NAME + "",
    Item: marshall(thread),
    ConditionExpression: "attribute_not_exists(#id)",
    ExpressionAttributeNames: {
      "#id": "id"
    }
  });

  await dynamodb.send(putItemCommand);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(thread)
  };
};

const getThread: RouteHandler<null, { id: string }> = async request => {
  const getItemCommand = new GetItemCommand({
    TableName: process.env.THREAD_TABLE_NAME + "",
    Key: marshall({ id: request.parameters.path.id })
  });

  const result = await dynamodb.send(getItemCommand);

  return result.Item
    ? {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unmarshall(result.Item))
      }
    : { statusCode: 404 };
};

builder.add("/thread", "POST", createThread);
builder.add("/thread/{id}", "GET", getThread);

export default builder.getHandler();
