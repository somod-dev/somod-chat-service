export type ThreadInput = {
  participants: string[];
} & ThreadSessionRequired;

export type ThreadSessionRequired = {
  sessionRequired?: string[];
  sessionRequiredTill?: number[];
};

export type Thread = {
  id: string;
  createdAt?: number;
} & ThreadInput &
  ThreadSessionRequired;

export type MessageInput = {
  threadId: string;
  type:
    | "text"
    | "image"
    | "control"
    | "audio-call"
    | "video-call"
    | "pooja"
    | "donation";
  action:
    | "new"
    | "edit"
    | "delete"
    | "sessionStart"
    | "sessionExtend"
    | "sessionEnd"
    | "sessionRequirementChange"
    | "initiated"
    | "declined";
  message: string;
  sessionToken?: string;
};

export type Message = {
  id: string;
  from: string;
  seqNo: number;
  sentAt: number;
  sessionId?: string;
} & MessageInput;

export type Session = {
  id: string;
  participants: string[];
  startTime: number;
  endTime: number;
};

export const typeToAllowedActionsMap = {
  text: ["new", "edit"],
  image: ["new", "edit"],
  control: [
    "delete",
    "sessionStart",
    "sessionExtend",
    "sessionEnd",
    "sessionRequirementChange"
  ],
  call: ["initiated", "declined"],
  pooja: ["new", "edit"],
  donation: ["new", "edit"]
};

/**
 * Store the message type and actions for which the session token is required
 */
export const sessionRequirement: Record<
  string,
  Record<string, undefined | "thread" | "always">
> = {
  text: { new: "thread", edit: "thread" },
  image: { new: "thread", edit: "thread" },
  control: {
    sessionStart: "always",
    sessionExtend: "always",
    sessionEnd: "always"
  }
};
