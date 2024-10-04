ALTER TABLE players ADD CONSTRAINT fk_players_accountId FOREIGN KEY (accountId) REFERENCES accounts(id);
ALTER TABLE player_cards ADD CONSTRAINT fk_player_cards_playerId FOREIGN KEY (playerId) REFERENCES players(id);
ALTER TABLE player_decks ADD CONSTRAINT fk_player_decks_playerId FOREIGN KEY (playerId) REFERENCES players(id);

ALTER TABLE player_deck_slots
ADD CONSTRAINT fk_player_deck_slots_deckId FOREIGN KEY (deckId) REFERENCES player_decks(id),
ADD CONSTRAINT fk_player_deck_slots_cardId FOREIGN KEY (cardId) REFERENCES player_cards(id);