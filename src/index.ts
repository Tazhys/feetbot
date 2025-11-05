import 'dotenv/config';
import { Bot } from './Bot';

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.CHANNEL_ID;
const geminiKey = process.env.GEMINI_API_KEY;

if (!token || !channelId || !geminiKey) {
  console.error('Please set DISCORD_TOKEN, CHANNEL_ID, and GEMINI_API_KEY environment variables');
  process.exit(1);
}

new Bot(token, channelId);