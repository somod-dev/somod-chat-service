export type ThreadInput = {
  participants: string[];
};

export type Thread = {
  id: string;
} & ThreadInput;

export type MessageInput = {
  threadId: string;
  type: "text" | "image" | "control";
  action:
    | "new"
    | "edit"
    | "delete"
    | "sessionStart"
    | "sessionExtend"
    | "sessionEnd";
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
  control: ["delete", "sessionStart", "sessionExtend", "sessionEnd"]
};
