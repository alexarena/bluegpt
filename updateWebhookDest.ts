import { APP_URL, SENDBLUE_API_KEY, SENDBLUE_API_SECRET } from "./envLoader.ts";

let webhookUrl = prompt("Enter webhook URL:");
if (!webhookUrl) {
  webhookUrl = APP_URL;
}

const res = await fetch("https://app.sendblue.co/api/b/accounts/webhooks", {
  body: JSON.stringify({
    webhooks: { receive: [webhookUrl] },
  }),
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    Pragma: "no-cache",
    "SB-API-KEY-ID": SENDBLUE_API_KEY,
    "SB-API-SECRET-KEY": SENDBLUE_API_SECRET,
  },
  method: "POST",
  mode: "cors",
  redirect: "follow",
  referrer: "https://app.sendblue.co/api-dashboard",
  referrerPolicy: "strict-origin-when-cross-origin",
});
const json = await res.json();
console.log(json);
