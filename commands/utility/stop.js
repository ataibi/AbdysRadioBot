const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, AudioPlayer } = require('@discordjs/voice');
const { crypto_auth_KEYBYTES } = require('libsodium-wrappers');


let hasAnswered = 0;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stop the playback and disconnect the bot.'),
	async execute(interaction) {
        const client = interaction.client;
        const guild = interaction.member.voice.channel.guild;
        const connection = getVoiceConnection(guild.id);
        const player = client.players[guild.id];

        if (!interaction.member.voice.channel) {
            return await interaction.reply({ content: 'You need to enter a voice channel before use the command', ephemeral: true })
        }
        if (!connection || !player) {
            return await interaction.reply({ content: 'The bot is not connected to your voice channel', ephemeral: true });
        }
        if (player.state) {
            client.modes[guild.id] = -1;
            player.stop();
            clearTimeout(client.timeOuts[guild.id]);
            connection.destroy();
            return await interaction.reply({ content: 'Stopped playback.', ephemeral: false });
        }
        return await interaction.reply({ content: 'Nothing is playing boi', ephemeral: true });
        	
	},
};