const { Client, MessageEmbed } = require("discord.js");
const config = require("./botconfig/config.json");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
  intents: 32767,
  partials: ["CHANNEL"]
});

require('http').createServer((req, res) => res.end('Bot is alive!')).listen(3000);

// When bot is ready:
client.once('ready', async () => {
  console.log(`[READY] ${client.user.username} is up and ready to go. Watching ${client.users.cache.size} users.\n`);
  client.user.setActivity(config.client.presence.ACTIVITY || `${config.prefix}help`, { type: config.client.presence.TYPE || "PLAYING" });
  client.user.setStatus(config.client.presence.STATUS || "online")

  if (!config.system.SERVER_ID) {
    console.warn(`[WARN] Missing value of variable SERVER_ID in ./botconfig/config.json.`);
    console.warn(`[WARN] This variable is required, stopping the process...`)
    process.exit(1);
  };

  const guild = client.guilds.cache.get(config.system.SERVER_ID);

  if (!guild) {
    console.warn(`[WARN] The bot is not on the provided server id in config.json`);
    console.warn(`[WARN] Please invite your bot there, stopping the process...`)
    process.exit(1);
  }

  if (!config.system.CATEGORY_ID) {
    console.warn(`[WARN] Missing value of variable CATEGORY_ID in ./botconfig/config.json.`);
    console.log(`[CLIENT] Creating a new modmail category...`);

    if (!guild.channels.cache.find(x => x.name === "Mod Mail")) {

      await guild.channels.create('Mod Mail', {
        type: "GUILD_CATEGORY",
        position: guild.channels.length + 1,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
          }
        ]
      }
      )

      console.log("\n[CLIENT] Done, created a new category named \"Mod Mail\".")
    } else {
      console.log("\n[CLIENT] Never mind, I found a category called \"Mod Mail\", everything is ready now!")
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Prefix Commands:
  if (message.guild) {
    if (message.content.indexOf(config.prefix) !== 0) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // If {prefix}close:
    if (cmd === "close") {
      if (!message.member.permissions.has("MANAGE_MESSAGES")) return;
      
      const guild = client.guilds.cache.get(config.system.SERVER_ID);
      const category = guild.channels.cache.find((x) => x.id === config.system.CATEGORY_ID || x.name === "Mod Mail");

      if (message.channel.parentId === category.id) {
        const member = message.guild.members.cache.get(message.channel.name);

        const reason = args.slice(0).join(" ");

        const embed = new MessageEmbed()
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setDescription(`Your mail has been closed by **${message.author.tag}**.`);

        if (reason) embed.setFooter({ text: `Reason: ${reason}` });

        await message.channel.delete().catch(() => { });

        return member.send({ embeds: [embed] }).catch(() => { });
      } else {
        const embed = new MessageEmbed()
          .setDescription(`This command only works for the category **${category.name}**.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      }
    };

    // If {prefix}ban:
    if (cmd === "ban") {
      if (!message.member.permissions.has("MANAGE_MESSAGES")) return;
      
      if (!args[0]) {
        const embed = new MessageEmbed()
          .setDescription(`Please provide the user to ban from using modmails.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      const user = message.mentions.members.first() || message.guild.members.cache.get(args[1]);

      if (!user) {
        const embed = new MessageEmbed()
          .setDescription(`Invalid user.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      const r = args.slice(1).join(" ");
      let reason;
      if (r) reason = r;
      if (!r) reason = "No reason was provided.";

      await db.add(`banned_${user.user.id}`, 1);
      await db.set(`banned_${user.user.id}_reason`, reason);

      const embed = new MessageEmbed()
        .setTitle("ModMail System:")
        .setDescription(`${user.user} has been **banned** from using the modmail system.\nReason: \`${reason}\`.`)
        .setColor("RED");

      return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
    };

    // If {prefix}ban:
    if (cmd === "unban") {
      if (!message.member.permissions.has("MANAGE_MESSAGES")) return;
      
      if (!args[0]) {
        const embed = new MessageEmbed()
          .setDescription(`Please provide the user to unban from using modmails.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      const user = message.mentions.members.first() || message.guild.members.cache.get(args[1]);

      if (!user) {
        const embed = new MessageEmbed()
          .setDescription(`Invalid user.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      await db.delete(`banned_${user.user.id}`);
      await db.delete(`banned_${user.user.id}_reason`);

      const embed = new MessageEmbed()
        .setTitle("ModMail System:")
        .setDescription(`${user.user} has been **unbanned** from using the modmail system.`)
        .setColor("GREEN");

      return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
    };

    // If {prefix}help:
    if (cmd === "help") {
      const embed = new MessageEmbed()
        .setTitle("ModMail System - Commands:")
        .setDescription(`This project has been created by T.F.A#7524 to let users to make their own modmail bot on their server(s) for free. You can check the support server by clicking [here](https://discord.gg/7zrFC2NPrd).`)
        .addFields(
          {
            name: `${config.prefix}help`,
            value: "Shows the help menu.\nUsage: `help`"
          },
          {
            name: `${config.prefix}ban`,
            value: "Ban a user from using modmails.\nUsage: `ban [user] [reason]`"
          },
          {
            name: `${config.prefix}unban`,
            value: "Unban a user from using modmails.\nUsage: `unban [user]`"
          },
          {
            name: `${config.prefix}close`,
            value: "Close a created modmail.\nUsage: `close [reason]`"
          },
        )
        .setColor("BLUE");

      return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
    }

    // ModMail system:
  } else {
    try {
      const guild = client.guilds.cache.get(config.system.SERVER_ID);
      const category = guild.channels.cache.find((x) => x.id === config.system.CATEGORY_ID || x.name === "Mod Mail");

      if (!category) {
        const embed = new MessageEmbed()
          .setDescription(`The ModMail system is not ready.`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      const banCheck = await db.get(`banned_${message.author.id}`);

      if (banCheck || banCheck == 1) {
        const reason = await db.get(`banned_${message.author.id}_reason`);
        
        const embed = new MessageEmbed()
          .setDescription(`You were **banned** from using modmail for: \`${reason}\``);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      }

      if (!category) {
        const embed = new MessageEmbed()
          .setDescription(`The ModMail system is ready, but seems like the category to log your mails has been deleted. :(`);

        return message.reply({ embeds: [embed], allowedMentions: [{ repliedUser: false }] });
      };

      const channel = guild.channels.cache.find((x) => x.name == message.author.id && x.parentId === category.id);

      if (!channel) {
        const ch = await guild.channels.create(message.author.id, {
          type: "text",
          parent: category.id,
          topic: `A new ModMail created by ${message.author.tag} (${message.author.id}) on ${Date.toLocaleString()}.`
        });

        const embedDM = new MessageEmbed()
          .setTitle(`${guild.name} - ModMail System:`)
          .setDescription(`Your mail has been successfully created, you can send more messages here until the mail will be closed. A staff member should respond to your mail soon.`)
          .setColor("GREEN");

        message.reply({ embeds: [embedDM], allowedMentions: [{ repliedUser: false }] }).catch(() => { });

        let embedDETAILS = new MessageEmbed()
          .setTitle("ModMail System - New Mail:")
          .setDescription(`A user has created a mail for requesting something.`)
          .addFields(
            {
              name: "User",
              value: `${message.author.tag} (\`${message.author.id}\`)`
            },
            {
              name: "Content",
              value: `${message.content}`
            },
            {
              name: "Mail creation date",
              value: `${new Date().toLocaleString()}`
            }
          )
          .setColor("BLURPLE");

        if (message.attachments.size) embedDETAILS.setImage(message.attachments.map(img => img)[0].proxyURL);

        ch.send({ embeds: [embedDETAILS] }).catch(() => { });

        message.react("📨").catch(() => { });
      } else {
        let embedNEWCONTENT = new MessageEmbed()
          .setAuthor({ name: `${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription(`${message.content}`)
          .setColor("GREEN");

        if (message.attachments.size) embedNEWCONTENT.setImage(message.attachments.map(img => img)[0].proxyURL);

        channel.send({ embeds: [embedNEWCONTENT] }).catch(() => { });

        message.react("📨").catch(() => { });
      } 
    } catch (e) {
      return console.log(e);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const guild = client.guilds.cache.get(config.system.SERVER_ID);
  const category = guild.channels.cache.find((x) => x.id === config.system.CATEGORY_ID || x.name === "Mod Mail");
  
  if (!category) return;
  
  // If a message from the mail channel:
  if (message.channel.parentId === category.id) {
    const member = message.guild.members.cache.get(message.channel.name);

    let perms;
    const ownerFetch = message.guild.ownerId;

    if (message.member.permissions.has("BAN_MEMBERS" || "KICK_MEMBERS" || "MODERATE_MEMBERS")) perms = "MODERATOR";
    if (message.member.permissions.has("MANAGE_SERVER")) perms = "MANAGER";
    if (message.member.permissions.has("ADMINISTRATOR")) perms = "ADMIN";
    if (ownerFetch === message.author.id) perms = "OWNER";

    let embedNEWCONTENT = new MessageEmbed()
      .setAuthor({ name: `${message.author.tag} - ${perms || "USER"}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(`${message.content}`)
      .setColor("RED");

    if (message.attachments.size) embedNEWCONTENT.setImage(message.attachments.map(img => img)[0].proxyURL);

    if (message.content.toLowerCase().startsWith(`${config.prefix}close`)) {
      return; // Because we won't show to the user's the command {prefix}close.
    } else {
      await member.send({ embeds: [embedNEWCONTENT] }).catch(() => { });
      message.react("📨").catch(() => { });
    }
  };
})

// If user mail is deleted:
client.on("channelDelete", async (channel) => {
  const category = channel.guild.channels.cache.find((x) => x.id === config.system.CATEGORY_ID || x.name === "Mod Mail")
  if (!category) return;

  const member = channel.guild.members.cache.get(channel.name) || await channel.guild.members.fetch(channel.name).catch(() => { });
  if (!member) return;

  const guild = client.guilds.cache.get(config.system.SERVER_ID);

  const embedDM = new MessageEmbed()
    .setTitle(`${guild.name} - ModMail System:`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription(`Your mail has been **successfully deleted** by a server staff. Create a new one by sending a message here.`)
    .setColor("GREEN");

  return member.send({ embeds: [embedDM] }).catch(() => { });
});

process.on('unhandledRejection', err => {
  console.log(`[ERROR] Unhandled promise rejection: ${err.message}.`);
  console.log(err);
});

// Login to the bot:
client.login(process.env.TOKEN || config.client.secrets.TOKEN).catch((e) => console.log(e))

/*
* Author: T.F.A#7524
* Helpers: none
* Credits required? Yes.
* Sharing this project to public or friends without giving credits to me ends in a copyright warning. Let's keep it cool :)
* Not giving credits in help command, ban command... (etc) is OK. But in this file (index.js) or README.md is NOT OK.
*/