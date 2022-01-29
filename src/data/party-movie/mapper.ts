import {Mapper} from '../mapper';
import {PartyMovie, DynamoPartyMovie} from './entity';

/**
 * PartyMovieMapper maps party objects between state store and logical formats.
 */
export const PartyMovieMapper: Mapper<PartyMovie, DynamoPartyMovie> = class {
  // Convert to state store format
  public static toDB(movie: PartyMovie): DynamoPartyMovie {
    return {
      pk: `party#${movie.partyId}`,
      sk: `movie#${movie.movieId}`,
      sk2: movie.score,
    };
  }

  // Convert from state store format
  public static fromDB(dyMovie: DynamoPartyMovie): PartyMovie {
    return {
      partyId: dyMovie.pk.split('#')[1],
      movieId: dyMovie.sk.split('#')[1],
      score: dyMovie.sk2,
    };
  }
};
