import { load } from "https://deno.land/std@0.202.0/dotenv/mod.ts";
import { OpenAIStream } from "npm:ai";
import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "npm:openai-edge";
import { bodySchema } from "./sendblueSchema.ts";

const env = await load();
function getEnv(key: string) {
  if (typeof env[key] === "string") {
    return env[key];
  }
  throw new Error(`Missing env var ${key}`);
}

const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
const APP_URL = getEnv("APP_URL");
const SENDBLUE_API_KEY = getEnv("SENDBLUE_API_KEY");
const SENDBLUE_API_SECRET = getEnv("SENDBLUE_API_SECRET");
const SENDBLUE_SIGNING_SECRET = getEnv("SENDBLUE_SIGNING_SECRET");
const YOUR_NUMBER = getEnv("YOUR_NUMBER");

const config = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

function iMessage(content: string) {
  return fetch(`https://api.sendblue.co/api/send-message`, {
    headers: new Headers({
      "sb-api-key-id": SENDBLUE_API_KEY,
      "sb-api-secret-key": SENDBLUE_API_SECRET,
      "content-type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify({
      number: YOUR_NUMBER,
      content,
      // send_style: "invisible",
      // media_url: 'https://picsum.photos/200/300.jpg',
      status_callback: APP_URL,
    }),
  });
}

function startTyping() {
  return fetch(`https://api.sendblue.co/api/send-typing-indicator`, {
    headers: new Headers({
      "sb-api-key-id": SENDBLUE_API_KEY,
      "sb-api-secret-key": SENDBLUE_API_SECRET,
      "content-type": "application/json",
    }),
    method: "POST",
    body: JSON.stringify({
      number: YOUR_NUMBER,
    }),
  });
}

const chatHistory: ChatCompletionRequestMessage[] = [
  {
    role: "system",
    content: `You are a helpful and kind AI Assistant.`,
  },
];

async function startRespondingToChat(content: string) {
  await startTyping();
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
    onToken: (token) => {
      Deno.stdout.writeSync(new TextEncoder().encode(token));
    },
    onCompletion: async (completion) => {
      chatHistory.push({ content: completion, role: "assistant" });
      await iMessage(completion);
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

    if (body.is_outbound === false && body.from_number !== YOUR_NUMBER) {
      throw new Error("Got a message from an unexpected number...");
    }

    if (body.is_outbound === false) {
      startRespondingToChat(body.content);
    }

    return new Response();
  } catch (e) {
    console.log(e);
    return new Response("Error");
  }
}

Deno.serve({ port: 3000 }, handler);
