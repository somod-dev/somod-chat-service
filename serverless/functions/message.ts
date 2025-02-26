import { RouteBuilder, RouteHandler } from "somod-http-extension";
import { MessageInput, UserProviderMiddlewareKey } from "../../lib";
import { putMessage, validateIncomingMessage } from "../../lib/message";
import { EventWithMiddlewareContext } from "somod";
import { v1 as v1uuid } from "uuid";
import {
  QueryCommand,
  DynamoDBClient,
  QueryCommandInput
} from "@aws-sdk/client-dynamodb";
import { convertToAttr, unmarshall } from "@aws-sdk/util-dynamodb";
import { handleSessionToken } from "../../lib/sessionUtil";
import { getUserIdFromEvent } from "../../lib/getUserIdFromEvent";

const dynamodb = new DynamoDBClient();

const builder = new RouteBuilder();

const postMessageHandler: RouteHandler<MessageInput> = async (
  request,
  event
) => {
  const userId = (
    event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
  ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;

  const messageValidationError = await validateIncomingMessage(
    request.body,
    userId
  );
  if (messageValidationError) {
    return messageValidationError;
  }

  const sessionIdResult = await handleSessionToken(
    userId,
    request.body.threadId,
    request.body.sessionToken
  );
  if (sessionIdResult.error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        message: sessionIdResult.error
      })
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionToken, ...msg } = request.body;

  const actions = ["sessionStart", "sessionExtend", "sessionEnd"];
  const message = await putMessage(
    process.env.MESSAGE_BOX_TABLE_NAME + "",
    userId,
    {
      ...msg,
      sessionId: sessionIdResult.sessionId,
      id: v1uuid().split("-").join(""),
      from: userId,
      sentAt: Date.now(),
      ...(actions.includes(request.body.action)
        ? { sessionToken: sessionToken }
        : {})
    }
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      id: message.id,
      seqNo: message.seqNo,
      sentAt: message.sentAt,
      from: message.from
    })
  };
};

const syncMessagesHandler: RouteHandler<
  null,
  Record<string, unknown>,
  { from?: string }
> = async (request, event) => {
  const userId = getUserIdFromEvent(event);

  const queryCommandInput = {
    TableName: process.env.MESSAGE_BOX_TABLE_NAME + "",
    KeyConditionExpression: "#userId = :userId",
    ExpressionAttributeNames: {
      "#userId": "userId"
    },
    ExpressionAttributeValues: {
      ":userId": convertToAttr(userId)
    }
  } satisfies QueryCommandInput;

  if (request.parameters.query.from) {
    queryCommandInput.KeyConditionExpression += " AND #seqNo >= :seqNo";
    queryCommandInput.ExpressionAttributeNames["#seqNo"] = "seqNo";
    queryCommandInput.ExpressionAttributeValues[":seqNo"] = {
      N: request.parameters.query.from
    };
  }

  const queryCommand = new QueryCommand(queryCommandInput);
  const result = await dynamodb.send(queryCommand);
  const messages = (result.Items || []).map(item => {
    const message = unmarshall(item);
    delete message.userId;
    return message;
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(messages)
  };
};

builder.add("/post-message", "POST", postMessageHandler);
builder.add("/sync-messages", "GET", syncMessagesHandler);

export default builder.getHandler();
