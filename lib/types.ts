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
  type: "text" | "image" | "control" | "audio-call" | "video-call";
  action: "new" | "edit" | "delete" | "callStart" | "callConnect" | "callEnd";
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
