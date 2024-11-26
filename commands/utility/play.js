const { SlashCommandBuilder } = require('discord.js');
const { createReadStream } = require('node:fs');
const { joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus, entersState, createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType  } = require('@discordjs/voice');
const fs = require('node:fs');
const path = require('node:path');
const songList = require('../../songList.json')

const RADIO = 1;
const PLAYLIST = 2;
const SOLO = 3;
const STOP = -1;
const RADIO_COOLDOWN = 2;
const RADIO_DELAY = 2;

const playSong = (player, client, guild, song) => {
    const songFile = song.props.path;
    client.nowPlaying = song;
    const resource = createAudioResource(songFile, { inlineVolume: true });
    resource.volume.setVolume(0.5);
    player.play(resource);
    return ;
}

const playTag = (player, client, guild, tag) => {
    const possibleSongs = songList.songs.filter(song => song.props.tags.includes(tag));
    const songIndex = Math.ceil(Math.random() * possibleSongs.length - 1);
    const song = possibleSongs[songIndex];
    playSong(player, client, guild, song);
    return ;
}

const startRadio = (player, client, guild, tag) => {
    client.tags[guild.id] = tag;
    if (tag !== "NOTAG") {
        return playTag(player, client, guild, tag);
    }
    let songIndex = Math.ceil(Math.random() * songList.songs.length - 1)
    let chosenSong = songList.songs[songIndex];
    return playSong(player, client, guild, chosenSong);
    
}

const startPlaylist = (player, client, guild, tag) => {
    client.tags[guild.id] = tag;
    if (tag !== "NOTAG") {
        return playTag(player, client, guild, tag);
    }

    let songIndex = Math.ceil(Math.random() * songList.songs.length - 1)
    let chosenSong = songList.songs[songIndex];
    return playSong(player, client, guild, chosenSong);

}

// const pickAndPlay = (player, client, guild) => {
//     let songIndex = Math.ceil(Math.random() * client.songs.size - 1)
//     let chosenSong = client.songs.get(songIndex);
//     client.nowPlaying = chosenSong
//     if (chosenSong != undefined) {
//         const resource = createAudioResource(chosenSong.path, { inlineVolume: true });
//         resource.volume.setVolume(0.5)
//         const interval = Math.round(Math.random() * (0 - 2) + 2);
//         console.log(`playing ${chosenSong.title}, next one in ${interval} minutes`);
//         client.timeOuts[guild.id] = setTimeout(() => {pickAndPlay(player, client, guild)}, ((interval * 60 * 1000) + (chosenSong.lengthSeconds * 1000)));
//         return player.play(resource);
//     } else {
//         return pickAndPlay(player, client, guild);
//     }
// }
const startConnection = (client, interaction) => {
    const channel = interaction.member.voice.channel;
    const guild = channel.guild;
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false 
    });
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
    return connection;
};

let data = new SlashCommandBuilder()
.setName('play')
.setDescription('Play music !')
.addSubcommandGroup(subcommandGroup => 
    subcommandGroup
        .setName("song")
        .setDescription("Play a song once and leave (if no song is specified, choses a random one)")
        .addSubcommand(subcommand =>
            subcommand.setName("genre")
                .setDescription("Restrains the selection of the song to only a given genre")
                .addStringOption(option =>
                    option.setName("tag")
                    .setDescription("set the genre")
                    .addChoices(
                        // data.options[0].SlashCommandSubcommandGroupBuilder.options[0].addChoices()
                    )
                    .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName("pick")
                .setDescription("Shows the list of possible songs to pick, then you pick one")
                .addStringOption(option =>
                    option.setName("name")
                    .setDescription("set the genre")
                    .addChoices(
                        
                    )
                    .setRequired(true)
                )
        )
)
.addSubcommand(subcommand => 
    subcommand
        .setName("radio")
        .setDescription("Start a radio of all songs, there will be a random interval of silence between the songs")
        .addStringOption(option =>
            option.setName("tag")
                .setDescription("Restrains the radio to only a given genre")
        )
)
.addSubcommand(subcommand =>
    subcommand.setName("playlist")
    .setDescription("Start playing all songs, songs will play one after another with no pause")
        .addStringOption(option =>
            option.setName("tag")
                .setDescription("Restrains the radio to only a given genre")
            )
)

songList.tags.forEach(tag => {
    data.options[0].options[0].options[0].addChoices(
        {name: tag, value: tag.toLowerCase()});
    data.options[1].options[0].addChoices(
        {name: tag, value: tag.toLowerCase()});
    data.options[2].options[0].addChoices(
            {name: tag, value: tag.toLowerCase()})
});

songList.songs.forEach(song => {
    data.options[0].options[1].options[0].addChoices(
        {name: song.title, value: song.title})
});

// console.log(songList.songs[3])
// const ethereal = songList.songs.find(song => song.title === "Ethereal").props
// console.log(ethereal)

module.exports = {
    data: data,
	async execute(interaction) {
        let hasAnswered = 0;
        const client = interaction.client;
        const connection = startConnection(client, interaction);
        const channel = interaction.member.voice.channel;
        const guild = channel.guild;
        
        if (!interaction.member.voice.channel) {
            return await interaction.reply({ content: 'You need to enter a voice channel before use the command', ephemeral: true })
        }
        
        client.players[guild.id] = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        const player = client.players[guild.id];
        
        player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
            player.play(getNextResource());
        });
        
        
        player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
            console.log(`Now playing ${client.nowPlaying.title}`);
        });

        player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
            switch (client.modes[guild.id]) {
                case RADIO:
                    const interval = Math.round(Math.random() * RADIO_DELAY + RADIO_COOLDOWN);
                    console.log(`next music in ${interval} minutes.`)
                    client.timeOuts[guild.id] = setTimeout(() => {
                        startRadio(player, client, guild, client.tags[guild.id])
                    }, interval * 60 * 1000);
                    
                    break;
                case PLAYLIST:
                    startPlaylist(player, client, guild, client.tags[guild.id])
                    break;
                default:
                    break;
            }
        });

        connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
            console.log('Connection is in the Ready state!');
            if (interaction.options.getSubcommand() === "radio") {

                client.modes[guild.id] = RADIO;
                const tag = interaction.options.getString("tag") ?? "NOTAG";
                console.log(`playing a radio with tag : ${tag}`);
                startRadio(player, client, guild, tag);
            } else if (interaction.options.getSubcommand() === "playlist") {
                
                client.modes[guild.id] = PLAYLIST;
                const tag = interaction.options.getString("tag") ?? "NOTAG";
                console.log(`playing a playlist with tag : ${tag}`);
                startPlaylist(player, client, guild, tag);
                
            } else if (interaction.options.getSubcommandGroup() === "song") {
    
                client.modes[guild.id] = SOLO;
    
                if (interaction.options.getSubcommand() === "pick") {
    
                    const song = songList.songs.find(song => song.title === interaction.options.getString('name'));
                    console.log(`playing ${song.title}`);
                    playSong(player, client, guild, song);
    
                } else if (interaction.options.getSubcommand() === "genre") {
    
                    const tag = interaction.options.getString("tag");
                    console.log(`playing a song with tag : ${tag}`);
                    playTag(player, client, guild, tag);
                }
            }       
                const subscription = connection.subscribe(player);
                if (hasAnswered == 0){
                    interaction.reply("et c'est parti !", {ephemeral:true});
                    hasAnswered = 1;
                }
        });
	},
};