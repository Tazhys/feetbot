import { Client, GatewayIntentBits, TextChannel, AttachmentBuilder, Message } from 'discord.js';
import axios from 'axios';

export class Bot {
  private client: Client;
  private channelId: string;
  private isActive: boolean = true;

  constructor(token: string, channelId: string) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });
    this.channelId = channelId;

    this.client.once('ready', () => {
      console.log('FeetBot is ready!');
    });

    this.client.on('messageCreate', (message) => {
      this.handleMessage(message);
    });

    this.client.login(token);
  }

  private handleMessage(message: Message) {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    if (content === 'feet pls') {
      if (this.isActive && message.channel instanceof TextChannel) {
        this.sendFeetPic(message.channel);
      }
    } else if (content === 'no feet pls') {
      this.isActive = false;
    }
  }

  private async generateFeetPic(): Promise<Buffer> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Generate an image of beautiful, well-maintained female feet. Make it realistic and aesthetic.'
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        }
      }
    );

    const base64Data = response.data.candidates[0].content.parts[0].inlineData.data;
    return Buffer.from(base64Data, 'base64');
  }

  private async sendFeetPic(channel: TextChannel) {
    try {
      const imageBuffer = await this.generateFeetPic();
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'feet-pic.png' });

      await channel.send({ files: [attachment] });
    } catch (error) {
      console.error('Failed to send feet pic:', error);
    }
  }

  public stop() {
    this.client.destroy();
  }
}
