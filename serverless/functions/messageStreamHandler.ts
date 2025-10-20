import { DynamoDBStreamHandler } from "aws-lambda";
import { Message } from "../../lib";
import { threadCache } from "../../lib/threadCache";
import { putMessage } from "../../lib/message";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const sns = new SNSClient();

const transfer = async (message: Message) => {
  if (message.action == "delete") {
    return;
  }
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

const notify = async (userId: string, message: Message) => {
  const publishCommand = new PublishCommand({
    TopicArn: process.env.MSG_NOTIFICATION_TOPIC + "",
    Message: JSON.stringify(message),
    MessageAttributes: { userId: { DataType: "String", StringValue: userId } }
  });

  await sns.send(publishCommand);
};

const streamHandler: DynamoDBStreamHandler = async event => {
  const messageRaw = event.Records[0]?.dynamodb?.NewImage;
  const eventName = event.Records[0]?.eventName ?? "";
  if (eventName == "REMOVE") {
    return;
  }
  if (messageRaw) {
    const message = unmarshall(
      messageRaw as Record<string, AttributeValue>
    ) as Message & { userId: string };

    const { userId, ...msg } = message;

    if (message.from === userId) {
      await transfer(msg);
    } else {
      await notify(userId, msg);
    }
  } else {
    // eslint-disable-next-line no-console
    console.error(event);
    throw new Error("messageRaw is not found in the event");
  }
};

export default streamHandler;
