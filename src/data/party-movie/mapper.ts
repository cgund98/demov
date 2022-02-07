import {Mapper} from '../mapper';
import {PartyMovie, DynamoPartyMovie} from './entity';

/**
 * PartyMovieMapper maps party objects between state store and logical formats.
 */
export const PartyMovieMapper: Mapper<PartyMovie, DynamoPartyMovie> = class {
  // Convert to state store format
  public static toDB(movie: PartyMovie): DynamoPartyMovie {
    return {
      pk: `party-movie#${movie.movieId}`,
      sk: `party#${movie.partyId}#movies`,
      sk2: movie.score,
      movieId: movie.movieId,
    };
  }

  // Convert from state store format
  public static fromDB(dyMovie: DynamoPartyMovie): PartyMovie {
    return {
      movieId: dyMovie.pk.split('#')[1],
      partyId: dyMovie.sk.split('#')[1],
      score: dyMovie.sk2,
    };
  }
};
