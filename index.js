const { Client, Intents, MessageEmbed } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (!message.content || message.author.bot) { return; }
	if (message.content === '!whitelist') {
		try {
			client.users.fetch(message.author.id).then(user => {
				user.send('Provide your Wallet address').then(m => {
          let filter = (msg) => !msg.author.bot && message.author.id === msg.author.id;
          const collector = m.channel.createMessageCollector({ max: 3, time: 15000, filter: filter });
          collector.on('collect', (m) => {
            if (!m.content || m.author.bot) { return; }
            const embed = new MessageEmbed()
              .setColor('#0099ff')
              .setTitle(m.content)
            user.send({
              "content": "Is this correct?",
              "ephemeral": true, 
              "embeds": [embed], 
              "components": [
                  {
                      "type": 1,
                      "components": [
                          {
                              "type": 2,
                              "label": "No",
                              "style": 4,
                              "custom_id": "decline"
                          }, {
                            "type": 2,
                            "label": "Yes",
                            "style": 1,
                            "custom_id": "confirm"
                          }
                      ]
          
                  }
              ]
            })
          });
          collector.on('end', (collected, reason) => {
            if (reason === 'time') {
              user.send('Ran out of time, please use !whitelist to start again');
            } else if (reason === 'limit') {
              user.send('Looks like you\'ve tried too many times, please use !whitelist to start again');
            }
          });
        })
			});
		}
		catch (error) {
			console.log(error);
		}
	}
});

client.on('interactionCreate', interaction => {
	if (interaction.componentType !== 'BUTTON') return;
  try {
    if (interaction.customId === 'confirm') {
      interaction.reply("Got it! You're all set - we've added your address to the whitelist!")
    } else if (interaction.customId === 'decline') {
      interaction.reply("OK, try again!");
    }
  } catch (error) {
    console.log(error);
  }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);