import { RouteBuilder, RouteHandler } from "somod-http-extension";
import { MessageInput, Thread, UserProviderMiddlewareKey } from "../../lib";
import { putMessage } from "../../lib/message";
import { EventWithMiddlewareContext } from "somod";
import { v1 as v1uuid } from "uuid";
import {
  QueryCommand,
  DynamoDBClient,
  QueryCommandInput,
  GetItemCommand
} from "@aws-sdk/client-dynamodb";
import { convertToAttr, marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { cache } from "../../lib/cache";

const dynamodb = new DynamoDBClient();
const threadCache = cache(100, 60000);

const builder = new RouteBuilder();

const postMessageHandler: RouteHandler<MessageInput> = async request => {
  const userId = request.body.from;

  const thread = await threadCache.get(request.body.threadId, async () => {
    const threadResult = await dynamodb.send(
      new GetItemCommand({
        TableName: process.env.THREAD_TABLE_NAME,
        Key: marshall({ id: request.body.threadId })
      })
    );
    return threadResult.Item
      ? (unmarshall(threadResult.Item) as Thread)
      : undefined;
  });

  if (thread === undefined) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid threadId : does not exist" })
    };
  }

  if (!thread.participants.includes(userId)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Invalid threadId : from '${userId}' is not a participant in thread '${thread.id}'`
      })
    };
  }

  const message = await putMessage(
    process.env.MESSAGE_BOX_TABLE_NAME + "",
    userId,
    {
      ...request.body,
      id: v1uuid().split("-").join(""),
      sentAt: Date.now()
    }
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application-json" },
    body: JSON.stringify({
      id: message.id,
      seqNo: message.seqNo,
      sentAt: message.sentAt
    })
  };
};

const syncMessagesHandler: RouteHandler<
  null,
  Record<string, unknown>,
  { from?: string }
> = async (request, event) => {
  const userId = (
    event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
  ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;

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
    queryCommandInput.ExpressionAttributeValues[":seqNo"] = convertToAttr(
      request.parameters.query.from
    );
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(messages)
  };
};

builder.add("/chat/post-message", "POST", postMessageHandler);
builder.add("/chat/sync-messages", "GET", syncMessagesHandler);

export default builder.getHandler();
