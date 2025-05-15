import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { convertToAttr, marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { RouteBuilder, RouteHandler } from "somod-http-extension";
import { v1 as v1uuid } from "uuid";
import { Thread, ThreadInput, ThreadSessionRequired } from "../../lib";

const builder = new RouteBuilder();

const dynamodb = new DynamoDBClient();

const createThread: RouteHandler<ThreadInput> = async request => {
  const now = Date.now();
  const thread: Thread = {
    ...request.body,
    id: v1uuid().split("-").join(""),
    createdAt: now
  };

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
    headers: { "Content-Type": "application/json; charset=utf-8" },
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
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(unmarshall(result.Item))
      }
    : { statusCode: 404 };
};

const updateSessionRequired: RouteHandler<
  Required<ThreadSessionRequired>,
  { id: string }
> = async request => {
  const updateItemCommand = new UpdateItemCommand({
    TableName: process.env.THREAD_TABLE_NAME + "",
    Key: marshall({ id: request.parameters.path.id }),
    UpdateExpression:
      "SET #sessionRequired = :sessionRequired, #sessionRequiredTill = :sessionRequiredTill",
    ExpressionAttributeNames: {
      "#sessionRequired": "sessionRequired",
      "#sessionRequiredTill": "sessionRequiredTill"
    },
    ExpressionAttributeValues: {
      ":sessionRequired": convertToAttr(request.body.sessionRequired),
      ":sessionRequiredTill": convertToAttr(request.body.sessionRequiredTill)
    }
  });

  await dynamodb.send(updateItemCommand);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message: "Thread updated successfully" })
  };
};

builder.add("/thread", "POST", createThread);
builder.add("/thread/{id}", "GET", getThread);
builder.add("/thread/{id}/session", "POST", updateSessionRequired);

export default builder.getHandler();
