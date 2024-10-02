ALTER TABLE players
ADD CONSTRAINT fk_players_accountId FOREIGN KEY (accountId) REFERENCES accounts(id),
ADD CONSTRAINT fk_players_currentDeckId FOREIGN KEY (currentDeckId) REFERENCES player_decks(id);

ALTER TABLE player_cards ADD CONSTRAINT fk_player_cards_playerId FOREIGN KEY (playerId) REFERENCES players(id);

ALTER TABLE player_decks ADD CONSTRAINT fk_player_decks_playerId FOREIGN KEY (playerId) REFERENCES players(id);

ALTER TABLE player_deck_cards
ADD CONSTRAINT fk_player_deck_cards_deckId FOREIGN KEY (deckId) REFERENCES player_decks(id),
ADD CONSTRAINT fk_player_deck_cards_cardId FOREIGN KEY (cardId) REFERENCES player_cards(id);