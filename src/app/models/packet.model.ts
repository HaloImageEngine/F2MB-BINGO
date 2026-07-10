export interface PacketMaster {
  PM_ID: number;
  PIDT: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  User_ID: number;
  GPCode: string | null;
  GPDescription: string | null;
  Comment: string | null;
  Created: string | null;
  Updated: string | null;
  CardCount: number;
}

export interface PacketDetail {
  PD_ID: number;
  PIDT: number;
  Card_ID: number;
  Status: string | null;
  Winner: boolean | null;
  Created: string | null;
  Updated: string | null;
}

export interface GamePacketIdSetByGci {
  PacketMasters: PacketMaster[];
  PacketDetails: PacketDetail[];
}

export interface GamePacketIdSetByGciRequest {
  Game_ID: number;
  Call_List_ID: number;
}
