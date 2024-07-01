# YGO Power of Chaos Game Emulator

## Description
A client emulator for [YGO: Power of Chaos](https://yugipedia.com/wiki/Yu-Gi-Oh!_Power_of_Chaos) game series ported to browser.  
The aim of this project is to develop a game with functionality that is as close as possible to the original.  
In addition to the original game, this game will be an online game, thus the existence of gameserver in the repository.  

NOTE: I do NOT own any of the `YGO: Power of Chaos` games. Please read the [disclaimer](https://github.com/CatchABus/ygo-emu-poc/blob/main/DISCLAIMER.md).

## Prerequisites
- [Node.js](https://nodejs.org) v20.6.0 or higher
- [Visual Studio Code](https://code.visualstudio.com) (Optional)

## Setup
- Open cmd/terminal in your computer or in your IDE (if using one)
- (Windows only) Hit `bash` to enter bash environment
- Hit `git clone https://github.com/CatchABus/ygo-emu-poc.git` to get a local copy of the repository
- Hit `cd ygo-emu-poc` to enter the root folder
- Hit `npm run setup` to install all necessary dependencies
- Hit `npx nx start card-downloader` to download all cards from [YGOPRODeck](https://ygoprodeck.com/api-guide) API. Card images will be stored directly into game folders
- Hit `npx nx assets:build client` to generate static assets for the game

## Usage
- Hit `npm run start` to start both client and gameserver. Client will listen to local port 5173.

## Credits
Special thanks goes to:
- YGOPRODeck for the card images
- derplayer for his amazing [YuGiOh-PoC-ModTools](https://github.com/derplayer/YuGiOh-PoC-ModTools)