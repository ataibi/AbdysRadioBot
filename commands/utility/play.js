const { SlashCommandBuilder } = require('discord.js');
const { createReadStream } = require('node:fs');
const { joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus, entersState, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType  } = require('@discordjs/voice');

const songs = ['close.mp3', 'closest.mp3'];

const pickAndPlay = (player) => {
    let chosenSong = `./songs/${songs[Math.round(Math.random() * 1)]}`
    const resource = createAudioResource(chosenSong, { inlineVolume: true });
    resource.volume.setVolume(0.5)
    player.play(resource);
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play the radio!'),
	async execute(interaction) {
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

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
            console.log('Connection is in the Ready state!');
            setTimeout(() => {
                pickAndPlay(player);
                const subscription = connection.subscribe(player);
                interaction.reply("et c'est parti !", {ephemeral:true})
            }, 100)
        });

        player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
            player.play(getNextResource());
        });
        
        
        player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
            console.log('Audio player is in the Playing state!');
        });

        player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            if (oldState.status == "playing") {
                const interval = Math.round(Math.random() * (15 - 2) + 2);
                console.log(`just finished playing, next one in ${interval} minutes`);
                setTimeout(() => {pickAndPlay(player)}, interval * 60 * 1000);
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