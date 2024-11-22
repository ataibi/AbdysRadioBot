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
        const guild = interaction.member.voice.channel.guild;
        const player = client.players[guild.id];
        if (!interaction.member.voice.channel) {
            return await interaction.reply({ content: 'You need to enter a voice channel before use the command', ephemeral: true })
        }
        if (!connection || !player) {
            return await interaction.reply({ content: 'The bot is not connected to your voice channel', ephemeral: true })
        }
        console.log(player)
        if (player.state.status ==  'playing') {
            player.pause();
            return await interaction.reply({ content: 'Paused', ephemeral: true })
        } else if (player.state.status == 'paused' || player.state.status == 'autopaused') {
            player.unpause();
            return await interaction.reply({ content: 'Resumed playback', ephemeral: true })
        }

        return await interaction.reply({ content: 'Nothing is playing boi', ephemeral: true })
        	
	},
};