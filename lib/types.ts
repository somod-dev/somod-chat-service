export type ThreadInput = {
  participants: string[];
};

export type Thread = {
  id: string;
} & ThreadInput;

export type MessageInput = {
  threadId: string;
  type: "text" | "image" | "control";
  action: "new" | "edit" | "delete" | "sessionToken";
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
