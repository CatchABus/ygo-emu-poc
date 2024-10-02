CREATE TABLE `accounts` (
  `id` BIGINT(20) AUTO_INCREMENT,
	`accountName` VARCHAR(100) NOT NULL,
	`password` VARCHAR(100) NOT NULL,
	`lastVisit` BIGINT(20) DEFAULT '0',
	PRIMARY KEY (`id`)
);