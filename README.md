## BlueGPT

_Talk with AI using iMessage_

## Usage

This basically just stitches together [OpenAI](https://openai.com) + [Sendblue](https://sendblue.co) so you'll need accounts with both.

The following environment variables must be specified (you can use a .env file if you like):

- APP_URL (This is the URL of your app. It must be publicly accessible to receive webhooks)
- SENDBLUE_API_KEY
- SENDBLUE_API_SECRET
- OPENAI_API_KEY
- SENDBLUE_SIGNING_SECRET
- YOUR_NUMBER (Your phone number, w/ country code: eg. +15555555555)

`deno run --watch --allow-net --allow-env --allow-read ./main.ts`

## Why?

¯\_(ツ)\_/¯
