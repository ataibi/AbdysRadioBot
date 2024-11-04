const { SlashCommandBuilder } = require('discord.js');
const { createReadStream } = require('node:fs');
const { joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus, entersState, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType  } = require('@discordjs/voice');
const fs = require('node:fs');
const path = require('node:path');

const pickAndPlay = (player, client) => {
    let songIndex = Math.ceil(Math.random() * client.songs.size - 1)
    let chosenSong = client.songs.get(songIndex);
    client.nowPlaying = chosenSong
    if (chosenSong != undefined) {
        const resource = createAudioResource(chosenSong.path, { inlineVolume: true });
        resource.volume.setVolume(0.5)
        return player.play(resource);
    } else {
        return pickAndPlay(player, client);
    }
}

let hasAnswered = 0;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play the radio!'),
	async execute(interaction) {
        const client = interaction.client;
        if (!interaction.member.voice.channel) {
            return await interaction.reply({ content: 'You need to enter a voice channel before use the command', ephemeral: true })
        }
        
        const channel = interaction.member.voice.channel;
        const channelId = channel.id

        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false 
        });

        client.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        const player = client.player

        connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
            console.log('Connection is in the Ready state!');
            setTimeout(() => {
                pickAndPlay(player, client);
                const subscription = connection.subscribe(player);
                if (hasAnswered == 0){
                    interaction.reply("et c'est parti !", {ephemeral:true});
                    hasAnswered = 1;
                }
            }, 100)
        });

        player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
            player.play(getNextResource());
        });
        
        
        player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
            console.log(`Now playing ${client.nowPlaying.title}`);
        });

        player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status == "playing") {
                const interval = Math.round(Math.random() * (15 - 2) + 2);
                console.log(`just finished playing, next one in ${interval} minutes`);
                setTimeout(() => {pickAndPlay(player, client)}, interval * 60 * 1000);
            }
        })

        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                connection.destroy();
            }
        });
		
	},
};