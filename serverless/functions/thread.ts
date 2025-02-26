import { RouteBuilder, RouteHandler } from "somod-http-extension";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { Thread, ThreadInput, ThreadSessionRequired } from "../../lib";
import { convertToAttr, marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v1, v1 as v1uuid } from "uuid";
import { putMessage } from "../../lib/message";
import { getUserIdFromEvent } from "../../lib/getUserIdFromEvent";

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
> = async (request, event) => {
  const userId = getUserIdFromEvent(event);

  const updateItemCommand = new UpdateItemCommand({
    TableName: process.env.THREAD_TABLE_NAME + "",
    Key: marshall({ id: request.parameters.path.id }),
    UpdateExpression: "SET #sessionRequired = :sessionRequired",
    ExpressionAttributeNames: {
      "#sessionRequired": "sessionRequired"
    },
    ExpressionAttributeValues: {
      ":sessionRequired": convertToAttr(request.body.sessionRequired)
    }
  });

  await dynamodb.send(updateItemCommand);

  try {
    await putMessage(process.env.MESSAGE_BOX_TABLE_NAME ?? "", userId, {
      id: v1().split("-").join(""),
      type: "control",
      action: "sessionRequirementChange",
      from: userId,
      message: JSON.stringify(request.body.sessionRequired),
      sentAt: Date.now(),
      threadId: request.parameters.path.id
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }

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
