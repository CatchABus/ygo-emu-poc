CREATE TABLE `players` (
	`id` BIGINT(20) AUTO_INCREMENT,
	`accountId` BIGINT(20) NOT NULL,
	`currentDeckId` BIGINT(20) NOT NULL,
	`volume` DECIMAL(4, 2) NOT NULL DEFAULT '1',
	`forbiddenCardsEnabled` TINYINT(1) DEFAULT '0',
	`fullScreenEnabled` TINYINT(1) DEFAULT '0',
	PRIMARY KEY (`id`)
);