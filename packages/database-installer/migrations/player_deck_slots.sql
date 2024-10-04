CREATE TABLE `player_deck_slots` (
	`deckId` BIGINT(20) NOT NULL,
	`cardId` BIGINT(20) NOT NULL,
	`type` ENUM('NORMAL','EXTRA','FUSION') NOT NULL,
	PRIMARY KEY (`deckId`,`cardId`,`type`)
);