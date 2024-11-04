const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection, AudioPlayer } = require('@discordjs/voice');
const { crypto_auth_KEYBYTES } = require('libsodium-wrappers');


let hasAnswered = 0;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('Gives you the name and duration of the song currently playing (if any)'),
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
        if (client.player.state.status !=  'playing') {
            return await interaction.reply({ content: 'No audio currently playing', ephemeral: true })
        }
        let progress = client.player.state.resource.playbackDuration / 1000
        let progressString = `${Math.trunc(progress /60)}:${Math.trunc(progress % 60).toLocaleString('en-US', {minimumIntegerDigits: 2,useGrouping: false})}`
        const nowPlayingMessage = `Vous écoutez ${client.nowPlaying.title}\nnous en sommes à ${progressString}/${client.nowPlaying.lengthString} (${Math.trunc((progress / client.nowPlaying.lengthSeconds)*100)}%)`
        return await interaction.reply({ content: nowPlayingMessage, ephemeral: false })
        	
	},
};