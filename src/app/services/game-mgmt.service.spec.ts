import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { GameMgmtService } from './game-mgmt.service';

/** Live API sample for Game_ID 1038 (missing game — HTTP 200, setup incomplete). */
const CHECK_GAME_SETUP_1038 = {
  Header: {
    Game_ID_Checked: 1038,
    User_ID_Found: null,
    Call_List_ID_Found: null,
    Check_Timestamp: '2026-06-05T13:41:28.09'
  },
  GameNightRows: [],
  GameRows: [],
  CallListMasterRows: [],
  CallListSongsByInning: [],
  CardsByInning: [],
  InningComparisons: [],
  OverallSummary: {
    Game_ID: 1038,
    User_ID: null,
    Call_List_ID: null,
    User_Game_Count: 0,
    Game_Records: 0,
    CallList_Master_Innings: 0,
    Songs_Innings: 0,
    Cards_Innings: 0,
    Total_Songs: 0,
    Total_Cards: 0,
    Inning_Sync_Status: 'ALL INNINGS IN SYNC'
  },
  ValidationReport: [
    {
      Check_Number: 1,
      Component: 'User_ID Lookup',
      Status: 'FAIL',
      Message: 'ERROR: Could not find User_ID for Game_ID 1038'
    },
    {
      Check_Number: 9,
      Component: 'OVERALL STATUS',
      Status: 'NOT READY',
      Message: 'One or more tables are missing data - SETUP INCOMPLETE'
    }
  ]
} as const;

describe('GameMgmtService checkGameSetup', () => {
  let service: GameMgmtService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameMgmtService]
    });
    service = TestBed.inject(GameMgmtService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('normalizes Check_GameSetup/1038 payload (empty row sets, null header fields, validation report)', () => {
    const gameId = 1038;

    service.checkGameSetup(gameId).subscribe(result => {
      expect(result.Header.Game_ID_Checked).toBe(1038);
      expect(result.Header.User_ID_Found).toBeNull();
      expect(result.Header.Call_List_ID_Found).toBeNull();
      expect(result.Header.Check_Timestamp).toBe('2026-06-05T13:41:28.09');

      expect(result.GameNightRows).toEqual([]);
      expect(result.GameRows).toEqual([]);
      expect(result.CallListMasterRows).toEqual([]);
      expect(result.CallListSongsByInning).toEqual([]);
      expect(result.CardsByInning).toEqual([]);
      expect(result.InningComparisons).toEqual([]);

      expect(result.OverallSummary.Game_ID).toBe(1038);
      expect(result.OverallSummary.User_ID).toBeNull();
      expect(result.OverallSummary.Call_List_ID).toBeNull();
      expect(result.OverallSummary.User_Game_Count).toBe(0);
      expect(result.OverallSummary.Game_Records).toBe(0);
      expect(result.OverallSummary.Inning_Sync_Status).toBe('ALL INNINGS IN SYNC');

      expect(result.ValidationReport.length).toBe(2);
      expect(result.ValidationReport[0].Check_Number).toBe(1);
      expect(result.ValidationReport[0].Status).toBe('FAIL');
      expect(result.ValidationReport[1].Component).toBe('OVERALL STATUS');
      expect(result.ValidationReport[1].Status).toBe('NOT READY');
    });

    const req = httpMock.expectOne(`${environment.bingoCheckGameSetupApiBaseUrl}/${gameId}`);
    expect(req.request.method).toBe('GET');
    req.flush(CHECK_GAME_SETUP_1038);
  });
});
