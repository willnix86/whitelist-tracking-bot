const { Client, Intents, MessageEmbed, MessageAttachment } = require('discord.js');
const fs = require('fs');
const reader = require('xlsx');
var Queue = require('better-queue');

require('dotenv').config();

const fName = `./${process.env.WHITELIST_FILENAME}.xlsx`;
const worksheetName = 'Wallet Addresses';
let interactionListener = false;

const waitlistQueue = new Queue(function (input, cb) {
  const {id, address} = input;
  console.log(`Adding ${id} to waitlist`);
  addToWaitlist(id, address);
  cb(null, result);
}, {maxRetries: 3});

function createExcelIfNotExists() {
  return new Promise((resolve, reject) => {
    fs.access(fName, async (err) => {
      if (err) {
        try {
          console.log("Creating file...");
          const workbook = reader.utils.book_new();
          const worksheet = reader.utils.json_to_sheet([
            {User: "", WalletAddress: ""}
          ]);
          reader.utils.book_append_sheet(workbook, worksheet, worksheetName);
          const result = await reader.writeFile(workbook, fName);
          console.log("File created - carry on!")
          resolve(true);
        } catch (error) {
          reject(error);
        }
      } else {
        console.log("File exists - carry on!")
        resolve(true);
      }
    });
  })

};

function addToWaitlist(walletUser, walletAddress) {
  return new Promise(async (resolve, reject) => {
    fs.access(fName, async (err) => {
      if (err) {
        try {
          await createExcelIfNotExists();
          addToWaitlist(walletUser, walletAddress);
        } catch (error) {
          reject(error);
        }
      } else {
        try {
          const workbook = reader.readFile(fName);
          const worksheet = workbook.Sheets[worksheetName];
          const dataToUpdate = reader.utils.sheet_to_json(worksheet);
          const userExists = dataToUpdate.find(user => user.User === walletUser);
          if (userExists) {
            userExists.WalletAddress = walletAddress;
          } else {
            dataToUpdate.push({
              "User": walletUser,
              "WalletAddress": walletAddress
            });
          }
          workbook.Sheets[worksheetName] = reader.utils.json_to_sheet(dataToUpdate);
          const result = await reader.writeFile(workbook, fName);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

function main() {
  // Create a new client instance
  const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

  // When the client is ready, run this code (only once)
  client.once('ready', async () => {
    await createExcelIfNotExists();
    console.log("Ready!");
  });

  client.on('message', message => {
    const author = message.author.id;
    if (!message.content || message.author.bot) { return; }
    if (message.content === '!whitelist') {
      try {
        client.users.fetch(author).then(user => {
          user.send('Please enter your wallet address').then(m => {
            let filter = (msg) => !msg.author.bot && author === msg.author.id;
            const collector = m.channel.createMessageCollector({ max: 3, time: 30000, filter: filter });
            collector.on('collect', async (collected) => {
              if (!collected.content || collected.author.bot) { return; }
              const walletAddress = collected.content;
              const walletUser = `${collected.author.username}#${collected.author.discriminator}`;
              const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(walletAddress);

                if (!interactionListener) {
                  client.on('interactionCreate', interaction => {
                    if (interaction.componentType !== 'BUTTON') return;
                    try {
                      if (interaction.customId === 'confirm') {
                        waitlistQueue.push({id: walletUser, address: walletAddress})
                        interaction.reply("Got it! You're all set - we've added your address to the whitelist!")
                      } else if (interaction.customId === 'decline') {
                        interaction.reply("OK, try again!");
                      }
                    } catch (error) {
                      console.log(error);
                    }
                  });
                  interactionListener = true;
                }

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
              });
            });
            collector.on('end', (collected, reason) => {
              if (reason === 'time' && collected.size === 0) {
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
    } else if (message.content === '!gimmie' && process.env.ADMIN_IDS.split(',').includes(author)) {
      try {
        client.users.fetch(author).then(user => {
          const attachment = new MessageAttachment(fName);
          user.send({
            "content": "Here you go!",
            "ephemeral": true, 
            "files": [attachment],
          })
        });
      } catch (error) {
        console.log(error);
      }
    }
  });

  // Login to Discord with your client's token
  client.login(process.env.DISCORD_TOKEN);
}

main();