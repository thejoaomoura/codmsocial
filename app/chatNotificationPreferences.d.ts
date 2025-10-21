export declare const NOTIFICATION_STORAGE_KEY_PREFIX: string;

type ReadableStorage = Pick<Storage, "getItem"> | null | undefined;
type WritableStorage = Pick<Storage, "setItem"> | null | undefined;

export declare function readConversationNotificationPreference(
  conversationId: string | null | undefined,
  storage?: ReadableStorage
): boolean;

export declare function writeConversationNotificationPreference(
  conversationId: string | null | undefined,
  enabled: boolean,
  storage?: WritableStorage
): void;
