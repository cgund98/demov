import {Mapper} from '../mapper';
import {Party, DynamoParty, PartyStatus} from './entity';

/**
 * PartyMapper maps party objects between state store and logical formats.
 */
export const PartyMapper: Mapper<Party, DynamoParty> = class {
  // Convert to state store format
  public static toDB(movie: Party): DynamoParty {
    return {
      pk: `party#${movie.partyId}`,
      sk: `join-code#${movie.joinCode}`,
      sk2: movie.creationTime,
      ownerId: movie.ownerId,
      lastModified: movie.lastModified,
      status: movie.status,
    };
  }

  // Convert from state store format
  public static fromDB(dyParty: DynamoParty): Party {
    return {
      partyId: dyParty.pk.split('#')[1],
      joinCode: dyParty.sk.split('#')[1],
      ownerId: dyParty.ownerId,
      creationTime: dyParty.sk2,
      lastModified: dyParty.lastModified,
      status: dyParty.status as PartyStatus,
    };
  }
};
