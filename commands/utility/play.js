const { SlashCommandBuilder } = require('discord.js');
const { createReadStream } = require('node:fs');
const { joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus, entersState, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType  } = require('@discordjs/voice');
const fs = require('node:fs');
const path = require('node:path');

const songsPath = path.join(__dirname, '/../../songs');
let songs = [];

const songsFiles = fs.readdirSync(songsPath).filter(file => file.endsWith('.mp3'));
songsFiles.forEach(file => {
    const songPath = path.join(songsPath, file)
    songs.push(songPath);
});

console.log(songs);

const pickAndPlay = (player) => {
    let songIndex = Math.round(Math.random() * songs.length - 1)
    let chosenSong = songs[songIndex];
    if (chosenSong) {
        const resource = createAudioResource(chosenSong, { inlineVolume: true });
    } else {
        return pickAndPlay(player);
    }
    resource.volume.setVolume(0.5)
    return player.play(resource);
}

let hasAnswered = 0;

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