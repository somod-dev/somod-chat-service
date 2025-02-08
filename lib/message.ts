import { marshall } from "@aws-sdk/util-dynamodb";
import { Message, MessageInput, typeToAllowedActionsMap } from "./types";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { threadCache } from "./threadCache";

const dynamodb = new DynamoDBClient();

export const putMessage = async (
  tableName: string,
  userId: string,
  message: Omit<Message, "seqNo">
) => {
  const msg: Message = {
    ...message,
    seqNo: Date.now()
  };

  const messageWithKeys: Message & { userId: string } = { ...msg, userId };

  const putItemCommand = new PutItemCommand({
    TableName: tableName,
    Item: marshall(messageWithKeys),
    ConditionExpression:
      "attribute_not_exists(#userId) AND attribute_not_exists(#seqNo)",
    ExpressionAttributeNames: {
      "#userId": "userId",
      "#seqNo": "seqNo"
    }
  });

  await dynamodb.send(putItemCommand);

  return msg;
};

export const validateIncomingMessage = async (
  message: MessageInput,
  userId: string
) => {
  let errorMessage: string | undefined = undefined;
  const thread = await threadCache.get(message.threadId);

  const sessionActions = ["sessionStart", "sessionExtend", "sessionEnd"];

  if (thread === undefined) {
    errorMessage = "Invalid threadId : does not exist";
  } else if (!thread.participants.includes(userId)) {
    errorMessage = `Invalid threadId : from '${userId}' is not a participant in thread '${thread.id}'`;
  } else if (!typeToAllowedActionsMap[message.type].includes(message.action)) {
    errorMessage = `Invalid action : action must be '${typeToAllowedActionsMap[
      message.type
    ].join(",")}' for '${message.type}' type`;
  } else if (sessionActions.includes(message.action) && !message.sessionToken) {
    errorMessage = `Required 'sessionToken' field when action is '${message.action}'`;
  }
  if (errorMessage) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        message: errorMessage
      })
    };
  }
};
