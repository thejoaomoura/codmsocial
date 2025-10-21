const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NOTIFICATION_STORAGE_KEY_PREFIX,
  readConversationNotificationPreference,
  writeConversationNotificationPreference,
} = require("../app/chatNotificationPreferences");

const createMockStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    dump: () => ({ ...data }),
  };
};

test("returns true when no conversation id is provided", () => {
  const storage = createMockStorage();
  assert.equal(readConversationNotificationPreference(null, storage), true);
  assert.equal(readConversationNotificationPreference(undefined, storage), true);
});

test("defaults to true when storage is unavailable", () => {
  assert.equal(readConversationNotificationPreference("abc", null), true);
  assert.equal(readConversationNotificationPreference("abc", {}), true);
});

test("reads stored false values from storage", () => {
  const conversationId = "conversation-42";
  const storage = createMockStorage({
    [`${NOTIFICATION_STORAGE_KEY_PREFIX}${conversationId}`]: "false",
  });

  assert.equal(readConversationNotificationPreference(conversationId, storage), false);
});

test("writes the preference to storage", () => {
  const conversationId = "conversation-7";
  const storage = createMockStorage();

  writeConversationNotificationPreference(conversationId, false, storage);
  assert.equal(
    storage.dump()[`${NOTIFICATION_STORAGE_KEY_PREFIX}${conversationId}`],
    "false"
  );

  writeConversationNotificationPreference(conversationId, true, storage);
  assert.equal(
    storage.dump()[`${NOTIFICATION_STORAGE_KEY_PREFIX}${conversationId}`],
    "true"
  );
});

test("ignores writes when storage is unavailable or conversation id is missing", () => {
  const storage = createMockStorage();
  writeConversationNotificationPreference(null, false, storage);
  assert.deepEqual(storage.dump(), {});

  const noSetStorage = {};
  writeConversationNotificationPreference("conversation-10", false, noSetStorage);
  assert.equal(Object.keys(noSetStorage).length, 0);
});
