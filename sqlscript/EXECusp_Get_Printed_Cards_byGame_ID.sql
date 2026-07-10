-- Print first 50 cards
EXEC dbo.usp_Get_Printed_Cards_byGame_ID @Game_ID = 1, @NoOfCards = 50;

-- Print all cards
EXEC dbo.usp_Get_Printed_Cards_byGame_ID @Game_ID = 1, @NoOfCards = 0;

-- Use default (200 cards)
EXEC dbo.usp_Get_Printed_Cards_byGame_ID @Game_ID = 1;