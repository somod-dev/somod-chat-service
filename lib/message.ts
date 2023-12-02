import { marshall } from "@aws-sdk/util-dynamodb";
import { Message } from "./types";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

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
