const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, AudioPlayer } = require('@discordjs/voice');
const { crypto_auth_KEYBYTES } = require('libsodium-wrappers');


let hasAnswered = 0;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pause or resume playback'),
	async execute(interaction) {
        const client = interaction.client;
        const connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
        if (!interaction.member.voice.channel) {
            return await interaction.reply({ content: 'You need to enter a voice channel before use the command', ephemeral: true })
        }
        if (!connection || !client.player) {
            return await interaction.reply({ content: 'The bot is not connected to your voice channel', ephemeral: true })
        }
        console.log(client.player)
        if (client.player.state.status ==  'playing') {
            client.player.pause();
            return await interaction.reply({ content: 'Paused', ephemeral: true })
        } else if (client.player.state.status == 'paused' || client.player.state.status == 'autopaused') {
            client.player.unpause();
            return await interaction.reply({ content: 'Resumed playback', ephemeral: true })
        }

        return await interaction.reply({ content: 'Nothing is playing boi', ephemeral: true })
        	
	},
};