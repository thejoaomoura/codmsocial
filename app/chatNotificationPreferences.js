const NOTIFICATION_STORAGE_KEY_PREFIX = "chat_notifications_enabled_";

function buildNotificationStorageKey(conversationId) {
  return `${NOTIFICATION_STORAGE_KEY_PREFIX}${conversationId}`;
}

function readConversationNotificationPreference(conversationId, storage) {
  if (!conversationId) {
    return true;
  }

  if (!storage || typeof storage.getItem !== "function") {
    return true;
  }

  const storedValue = storage.getItem(buildNotificationStorageKey(conversationId));
  return storedValue !== "false";
}

function writeConversationNotificationPreference(conversationId, enabled, storage) {
  if (!conversationId) {
    return;
  }

  if (!storage || typeof storage.setItem !== "function") {
    return;
  }

  storage.setItem(buildNotificationStorageKey(conversationId), String(enabled));
}

export {
  NOTIFICATION_STORAGE_KEY_PREFIX,
  readConversationNotificationPreference,
  writeConversationNotificationPreference,
};
