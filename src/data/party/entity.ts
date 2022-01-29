import {DynamoEntity} from '../entity';

/**
 * Party is an entity representing a swiping party.
 */
export interface Party {
  partyId: string;
  joinCode: string; // secondary code that a user can use to join the party
  ownerId: string; // id of the user that created the party
  creationTime: number; // when the party was created (unix)
  lastModified: number; // last time the party object was modified (unix)
  status: string; // can be one of ('waiting', 'active')
}

/**
 * DynamoParty is the format in which a Party object will be persisted in DynamoDB.
 */
export interface DynamoParty extends DynamoEntity {
  ownerId: string;
  lastModified: number;
  status: string;
}
