/**
 * Partial shapes of ESPN Fantasy (unofficial v3 API) responses.
 * Every field is optional because ESPN omits fields inconsistently,
 * especially for older seasons. Importers must not assume presence.
 */

export interface EspnMember {
  id?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  isLeagueManager?: boolean;
}

export interface EspnRecordLine {
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  percentage?: number;
}

export interface EspnTeam {
  id?: number;
  name?: string;
  location?: string;
  nickname?: string;
  abbrev?: string;
  owners?: string[];
  primaryOwner?: string;
  playoffSeed?: number;
  rankCalculatedFinal?: number;
  rankFinal?: number;
  points?: number;
  record?: { overall?: EspnRecordLine };
}

export interface EspnScheduleSide {
  teamId?: number;
  totalPoints?: number;
  cumulativeScore?: { wins?: number; losses?: number; ties?: number };
}

export interface EspnScheduleItem {
  id?: number;
  matchupPeriodId?: number;
  playoffTierType?: string;
  winner?: string;
  home?: EspnScheduleSide;
  away?: EspnScheduleSide;
}

export interface EspnSettings {
  name?: string;
  size?: number;
  isPublic?: boolean;
  scoringSettings?: { scoringType?: string };
  scheduleSettings?: {
    matchupPeriodCount?: number;
    playoffTeamCount?: number;
    playoffMatchupPeriodLength?: number;
  };
}

export interface EspnStatus {
  currentMatchupPeriod?: number;
  isActive?: boolean;
  latestScoringPeriod?: number;
  finalScoringPeriod?: number;
  previousSeasons?: number[];
}

export interface EspnLeague {
  id?: number;
  seasonId?: number;
  scoringPeriodId?: number;
  settings?: EspnSettings;
  status?: EspnStatus;
  members?: EspnMember[];
  teams?: EspnTeam[];
  schedule?: EspnScheduleItem[];
}
