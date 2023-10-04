import { OpenAIStream } from "npm:ai";
import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "npm:openai-edge";
import { bodySchema } from "./sendblueSchema.ts";
import {
  OPENAI_API_KEY,
  SENDBLUE_API_KEY,
  SENDBLUE_API_SECRET,
  YOUR_NUMBER,
  APP_URL,
  SENDBLUE_SIGNING_SECRET,
} from "./envLoader.ts";

const config = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

function iMessage(to: string, content: string) {
  return fetch(`https://api.sendblue.co/api/send-message`, {
    headers: new Headers({
      "sb-api-key-id": SENDBLUE_API_KEY,
      "sb-api-secret-key": SENDBLUE_API_SECRET,
      "content-type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify({
      number: to,
      content,
      // send_style: "invisible",
      // media_url: 'https://picsum.photos/200/300.jpg',
      status_callback: APP_URL,
    }),
  });
}

function startTyping(to: string) {
  return fetch(`https://api.sendblue.co/api/send-typing-indicator`, {
    headers: new Headers({
      "sb-api-key-id": SENDBLUE_API_KEY,
      "sb-api-secret-key": SENDBLUE_API_SECRET,
      "content-type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify({
      number: to,
    }),
  });
}

const chatHistory: ChatCompletionRequestMessage[] = [
  {
    role: "system",
    content: `You are a helpful and kind AI Assistant.`,
  },
];

let pendingChunk = "";

async function startRespondingToChat(to: string, content: string) {
  await startTyping(to);
  chatHistory.push({
    role: "user",
    content,
  });
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    stream: true,
    messages: chatHistory,
  });
  const stream = OpenAIStream(response, {
    onToken: async (token) => {
      Deno.stdout.writeSync(new TextEncoder().encode(token));
      pendingChunk += token;
      if (pendingChunk.endsWith("\n")) {
        await iMessage(to, pendingChunk);
        await startTyping(to);
        pendingChunk = "";
      }
    },
    onCompletion: async (completion) => {
      if (pendingChunk.length > 0) {
        await iMessage(to, pendingChunk);
        pendingChunk = "";
      }
      chatHistory.push({ content: completion, role: "assistant" });
      console.log("\n");
      console.log(chatHistory);
    },
  });
  const reader = stream.getReader();

  let done = false;
  while (!done) {
    const res = await reader.read();
    done = res.done;
  }
}

async function handler(req: Request): Promise<Response> {
  try {
    const secret = req.headers.get("sb-signing-secret");

    const rawBody = await req.json();
    const body = bodySchema.parse(rawBody);

    if (body.is_outbound === true) {
      if (body.status === "DELIVERED") {
        return new Response();
      }
    }

    if (secret !== SENDBLUE_SIGNING_SECRET) {
      console.log(`Invalid request w/ body:`, body);
      throw new Error("Invalid request");
    }

    if (YOUR_NUMBER) {
      if (body.is_outbound === false && body.from_number !== YOUR_NUMBER) {
        throw new Error("Got a message from an unexpected number...");
      }
    }

    if (body.is_outbound === false) {
      startRespondingToChat(body.from_number, body.content);
    }

    return new Response();
  } catch (e) {
    console.log(e);
    return new Response("Error");
  }
}

Deno.serve({ port: 3000 }, handler);
