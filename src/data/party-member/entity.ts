import {DynamoEntity} from '../entity';

/**
 * Member is an entity representing a swiping party member.
 */
export interface Member {
  partyId: string;
  memberId: string;
  joinTime: number;
  name: string;
  swiped: number;
}

/**
 * DynamoMember is the format in which a Member object will be persisted in DynamoDB.
 */
export interface DynamoMember extends DynamoEntity {
  name: string;
  swiped: number;
}
