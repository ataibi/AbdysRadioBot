const fs = require('node:fs');
const { getAudioDurationInSeconds } = require('get-audio-duration')
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
let index = 0

const importSong = (songPath, songFile, songDuration, songIndex) => {
	let duration = `${Math.trunc(songDuration / 60)}:${Math.trunc(songDuration % 60).toLocaleString('en-US', {minimumIntegerDigits: 2,useGrouping: false})}`;
	const song = {
		title: songFile.split('.mp3')[0],
		lengthString: duration,
		lengthSeconds: songDuration,
		path: songPath
	};
	index++;
	return client.songs.set(songIndex, song);
}

client.songs = new Collection();
const songsPath = path.join(__dirname, 'songs');
const songsFiles = fs.readdirSync(songsPath).filter(file => file.endsWith('.mp3'));

songsFiles.forEach(file => {
    const songPath = path.join(songsPath, file)
	getAudioDurationInSeconds(songPath).then((duration) =>{
		console.log(`importing song : ${file}`)
		importSong(songPath, file, duration, index);
	});
});
client.nowPlaying = '';
client.players = [];
client.modes = [];
client.tags = [];
client.timeOuts = [];

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);