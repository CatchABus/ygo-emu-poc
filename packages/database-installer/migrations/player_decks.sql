CREATE TABLE `player_decks` (
	`id` BIGINT(20) NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(100) DEFAULT NULL,
	`playerId` BIGINT(20) NOT NULL,
	PRIMARY KEY (`id`)
);