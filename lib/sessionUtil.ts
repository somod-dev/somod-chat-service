import { verify } from "jsonwebtoken";
import { Session } from "./types";

const sessionJwtSecret = process.env.SESSION_SECRET ?? "";
const sessionForce = process.env.SESSION_FORCE ?? "";
type SessionIdResult = { sessionId: string; error?: string };

export const Error = {
  required: "missing required field: sessionToken",
  invalid: "invalid field: sessionToken"
};

export const handleSessionToken = (
  threadId: string,
  sessionToken?: string
): SessionIdResult => {
  const result: SessionIdResult = { sessionId: "" };
  if (sessionJwtSecret) {
    if (!sessionToken) {
      if (sessionForce == "true") {
        result.error = Error.required;
      }
    } else {
      try {
        const session = verify(sessionToken, sessionJwtSecret + "", {
          algorithms: ["HS512"],
          ignoreExpiration: true
        }) as Session;
        const now = Date.now();
        if (
          session.threadId == threadId &&
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
          "session token verification failed. threadId=" +
            threadId +
            ", error=" +
            err
        );
        result.error = Error.invalid;
      }
    }
  }

  return result;
};
