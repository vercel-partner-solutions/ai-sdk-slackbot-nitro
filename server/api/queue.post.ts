import { handleCallback } from "@vercel/queue";

export default defineEventHandler(async (event) => {
  handleCallback({
    messages: {
      im: async (message) => {
        console.log("Processing message:", message);
        console.log("event:", event);
        console.log("Processing message:", message);
      },
    },
  });
});
