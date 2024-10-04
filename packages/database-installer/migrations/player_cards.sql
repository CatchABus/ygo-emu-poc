CREATE TABLE `player_cards` (
  `id` BIGINT(20) AUTO_INCREMENT,
	`playerId` BIGINT(20) NOT NULL,
	`cardNum` BIGINT(20) NOT NULL,
	`count` INT(10) DEFAULT '1',
	`isNew` TINYINT(1) DEFAULT '0',
	PRIMARY KEY (`id`),
	UNIQUE (`playerId`,`cardNum`)
);