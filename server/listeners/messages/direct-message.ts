import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import { getChannelContextAsModelMessage } from "~/lib/slack/get-channel-context";
import { getThreadContextAsModelMessage } from "~/lib/slack/get-thread-context";
import { send } from "@vercel/queue";

const directMessageCallback = async ({
  message,
  event,
  say,
  logger,
  context,
  client,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  if (
    event.channel_type === "im" &&
    "text" in message &&
    typeof message.text === "string"
  ) {
    logger.debug("Direct message event received:", event);

    let threadContext: ModelMessage[] = [];

    // Send a message to a topic
    await send("messages", {
      type: "im",
      text: message.text,
      channel: message.channel,
      user: message.user,
      ts: message.ts,
      thread_ts: "thread_ts" in message ? message.thread_ts : undefined,
    });

    try {
      if ("thread_ts" in message && message.thread_ts) {
        client.assistant.threads.setStatus({
          channel_id: message.channel,
          thread_ts: message.thread_ts,
          status: "is typing...",
        });

        threadContext = await getThreadContextAsModelMessage(
          message.thread_ts,
          message.channel,
          context.botId,
        );
      } else {
        threadContext = await getChannelContextAsModelMessage(
          message.channel,
          context.botId,
        );
      }
    } catch (error) {
      logger.error("Failed to get context, using message as fallback:", error);
      threadContext = [{ role: "user", content: message.text }];
    }
    const response = await respondToMessage(threadContext);

    await say({
      text: response,
      thread_ts: message.ts,
    });
  } else {
    logger.debug("Direct message received with no text");
  }
};

export default directMessageCallback;
