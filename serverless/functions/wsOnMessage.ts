import { RouteBuilder, Message } from "somod-websocket-extension";
import { MessageInput } from "../../lib/types";
import { threadCache } from "../../lib/threadCache";
import { putMessage } from "../../lib/message";
import { v1 as v1uuid } from "uuid";
import { EventWithMiddlewareContext } from "somod";
import { UserProviderMiddlewareKey } from "../../lib";
import jwt from "jsonwebtoken";
import handleSessionToken from "./sessionUtil";

const builder = new RouteBuilder();

builder.add(
  "$default",
  async (message: Message<MessageInput & { wsMsgId: string }>, event) => {
    const userId = (
      event as unknown as EventWithMiddlewareContext<Record<string, unknown>>
    ).somodMiddlewareContext.get(UserProviderMiddlewareKey) as string;

    /**
     * session support can be enabled by setting authorizer.jwt.secret. If set,  AUTHORIZER_SECRET would be available.
     * here we check if the user has passed a sessionToken. if passed, we validate it.
     * TODO: this check needs to be removed once all users migrate and are using sessionToken
     */
    let sessionId = "";
    if (message.body.sessionToken != null) {
      console.log("session token passed. userId=" + userId);
      const tokenValidationResponse = await handleSessionToken(
        message.body.sessionToken,
        userId
      );
      if (tokenValidationResponse?.error != null) {
        return {
          headers: { "Content-Type": "application/json; charset=utf-8" },
          statusCode: tokenValidationResponse.statusCode,
          body: JSON.stringify({
            wsMsgId: message.body.wsMsgId,
            type: "error",
            message: tokenValidationResponse.error
          })
        };
      } else {
        sessionId = tokenValidationResponse.sessionId || "";
      }
    } else {
      console.log("session token not passed. userId=" + userId);
    }

    const thread = await threadCache.get(message.body.threadId);

    if (thread === undefined) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsMsgId: message.body.wsMsgId,
          type: "error",
          message: "Invalid threadId : does not exist"
        })
      };
    }

    if (!thread.participants.includes(userId)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsMsgId: message.body.wsMsgId,
          type: "error",
          message: `Invalid threadId : from '${userId}' is not a participant in thread '${thread.id}'`
        })
      };
    }

    const { wsMsgId, sessionToken, ...msg } = message.body;

    const messageResult = await putMessage(
      process.env.MESSAGE_BOX_TABLE_NAME + "",
      userId,
      {
        ...msg,
        sessionId: sessionId,
        from: userId,
        id: v1uuid().split("-").join(""),
        sentAt: Date.now()
      }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wsMsgId,
        type: "ack",
        id: messageResult.id,
        seqNo: messageResult.seqNo,
        sentAt: messageResult.sentAt,
        from: messageResult.from
      })
    };
  }
);

export default builder.getHandler();
