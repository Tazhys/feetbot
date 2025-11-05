import { Client, GatewayIntentBits, TextChannel, AttachmentBuilder, Message } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

export class Bot {
  private client: Client;
  private channelId: string;
  private isActive: boolean = true;

  constructor(token: string, channelId: string) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });
    this.channelId = channelId;

    this.client.once('ready', () => {
      console.log('FeetBot is ready!');
    });

    this.client.on('messageCreate', (message) => {
      console.log('Message received:', message.content, 'from:', message.author.username);
      this.handleMessage(message);
    });

    this.client.login(token);
  }

  private handleMessage(message: Message) {
    console.log('handleMessage called with:', message.content.toLowerCase());
    if (message.author.bot) {
      console.log('Ignoring bot message');
      return;
    }

    const content = message.content.toLowerCase();
    console.log('Processing content:', content, 'isActive:', this.isActive);

    if (content === 'feet pls') {
      console.log('Feet pls command detected');
      if (this.isActive && message.channel instanceof TextChannel) {
        console.log('Sending feet pic...');
        this.sendFeetPic(message.channel);
      } else {
        console.log('Bot not active or not a text channel');
      }
    } else if (content === 'no feet pls') {
      console.log('No feet pls command detected, deactivating bot');
      this.isActive = false;
    }
  }

  private async generateFeetPic(): Promise<Buffer> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = 'Create a realistic image of clean human feet in comfortable socks, showing everyday casual footwear';

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: prompt,
        });

        console.log('Gemini API response received');

        if (!response.candidates || !response.candidates[0] || !response.candidates[0].content) {
          throw new Error('No candidates in response');
        }

        const parts = response.candidates[0].content.parts;
        if (!parts) {
          throw new Error('No parts in response content');
        }

        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('Found image data in response');
            return Buffer.from(part.inlineData.data, 'base64');
          } else if (part.text) {
            console.log('API returned text instead of image:', part.text);
            throw new Error(`API refused to generate image: ${part.text.trim()}`);
          }
        }

        throw new Error('No image data found in response');
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);

        // If it's a quota exceeded error and we haven't reached max retries, wait and retry
        if ((error.status === 429 || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) && attempt < maxRetries) {
          const waitTime = 3000 + (attempt * 1000); // Wait 3s, then 4s, then 5s
          console.log(`Quota exceeded, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // If it's not a quota error or we've exhausted retries, throw the error
        throw error;
      }
    }

    throw lastError;
  }

  private async sendFeetPic(channel: TextChannel) {
    try {
      const imageBuffer = await this.generateFeetPic();
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'feet-pic.png' });

      await channel.send({ files: [attachment] });
    } catch (error: any) {
      console.error('Failed to send feet pic:', error);

      if (error.message.includes('API refused to generate image')) {
        await channel.send('Sorry, the AI service refused to generate that image due to content policies. Try a different request!');
      } else if (error.status === 429 || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
        await channel.send('Sorry, the AI service quota has been exceeded. The free tier limits have been reached. Please try again later or consider upgrading your API plan.');
      } else {
        await channel.send('Sorry, there was an error generating the image. Please try again later.');
      }
    }
  }

  public stop() {
    this.client.destroy();
  }
}
