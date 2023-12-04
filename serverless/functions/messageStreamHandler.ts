import { DynamoDBStreamHandler } from "aws-lambda";
import { Message } from "../../lib";
import { threadCache } from "../../lib/threadCache";
import { putMessage } from "../../lib/message";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

const transfer = async (message: Message) => {
  const thread = await threadCache.get(message.threadId);
  if (thread) {
    const targets = thread.participants.filter(p => p != message.from);
    await Promise.all(
      targets.map(async target => {
        await putMessage(
          process.env.MESSAGE_BOX_TABLE_NAME + "",
          target,
          message
        );
      })
    );
  } else {
    throw new Error(`Thread '${message.threadId}' not found`);
  }
};

const streamHandler: DynamoDBStreamHandler = async event => {
  const messageRaw = event.Records[0]?.dynamodb?.NewImage;
  if (messageRaw) {
    const message = unmarshall(
      messageRaw as Record<string, AttributeValue>
    ) as Message & { userId: string };

    if (message.from === message.userId) {
      await transfer(message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(messageRaw);
  }
};

export default streamHandler;
