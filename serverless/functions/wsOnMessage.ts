import { RouteBuilder, Message } from "somod-websocket-extension";
import { MessageInput } from "../../lib/types";
import { threadCache } from "../../lib/threadCache";
import { putMessage } from "../../lib/message";
import { v1 as v1uuid } from "uuid";
import { EventWithMiddlewareContext } from "somod";
import { UserProviderMiddlewareKey } from "../../lib";

const builder = new RouteBuilder();

builder.add(
  "$default",
  async (message: Message<MessageInput & { wsMsgId: string }>, event) => {
    const userId = (
      event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
    ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;

    const thread = await threadCache.get(message.body.threadId);

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

    const { wsMsgId, ...msg } = message.body;

    const messageResult = await putMessage(
      process.env.MESSAGE_BOX_TABLE_NAME + "",
      userId,
      {
        ...msg,
        from: userId,
        id: v1uuid().split("-").join(""),
        sentAt: Date.now()
      }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application-json" },
      body: JSON.stringify({
        wsMsgId,
        id: messageResult.id,
        seqNo: messageResult.seqNo,
        sentAt: messageResult.sentAt,
        from: messageResult.from
      })
    };
  }
);

export default builder.getHandler();
