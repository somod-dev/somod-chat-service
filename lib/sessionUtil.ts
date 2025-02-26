import { verify } from "jsonwebtoken";
import { Session } from "./types";
import { threadCache } from "./threadCache";

const sessionJwtSecret = process.env.SESSION_SECRET ?? "";
const sessionForce = process.env.SESSION_FORCE ?? "";
type SessionIdResult = { sessionId: string; error?: string };

export const Error = {
  required: "missing required field: sessionToken",
  invalid: "invalid field: sessionToken"
};

export const handleSessionToken = async (
  userId: string,
  threadId: string,
  sessionToken?: string
): Promise<SessionIdResult> => {
  const result: SessionIdResult = { sessionId: "" };
  if (sessionJwtSecret) {
    if (!sessionToken) {
      if (sessionForce == "true") {
        result.error = Error.required;
      } else {
        const thread = await threadCache.get(threadId, 5000);
        if (thread?.sessionRequired?.includes(userId)) {
          result.error = Error.required;
        }
      }
    } else {
      try {
        const session = verify(sessionToken, sessionJwtSecret + "", {
          algorithms: ["HS512"],
          ignoreExpiration: true
        }) as Session;
        const now = Date.now();
        if (
          session.participants.includes(userId) &&
          session.startTime <= now &&
          now <= session.endTime
        ) {
          result.sessionId = session.id;
        } else {
          result.error = Error.invalid;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "session token verification failed. userId=" +
            userId +
            ", error=" +
            err
        );
        result.error = Error.invalid;
      }
    }
  }

  return result;
};
