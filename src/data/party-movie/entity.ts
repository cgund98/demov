import {DynamoEntity} from '../entity';

/**
 * PartyMovie is an entity representing a swiping party member.
 */
export interface PartyMovie {
  partyId: string;
  movieId: string;
  score: number;
}

/**
 * DynamoPartyMovie is the format in which a PartyMovie object will be persisted in DynamoDB.
 */
export type DynamoPartyMovie = DynamoEntity;
