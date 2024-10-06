CREATE TABLE `accounts` (
  `id` BIGINT(20) AUTO_INCREMENT,
	`accountName` VARCHAR(100) NOT NULL,
	`password` VARCHAR(100) NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE (`accountName`)
);