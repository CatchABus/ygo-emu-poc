CREATE TABLE `player_deck_cards` (
	`deckId` BIGINT(20) NOT NULL,
	`cardId` BIGINT(20) NOT NULL,
	`index` INT(10) NOT NULL,
	PRIMARY KEY (`deckId`,`cardId`,`index`),
  FOREIGN KEY (deckId) REFERENCES player_decks(id),
  FOREIGN KEY (cardId) REFERENCES player_cards(id)
);