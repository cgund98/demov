import axios from 'axios';
import {S3, SQS, SSM} from 'aws-sdk';
import {SQSEvent, SQSHandler} from 'aws-lambda';

import {forEach} from '../util/async';
import {logger} from '../util/logging';
import {BUCKET_HR_PREFIX, BUCKET_LR_PREFIX} from '../util/config';

// Init clients
const s3 = new S3();
const sqs = new SQS();
const ssm = new SSM();

// Create HTTP client for calling OMDb API
const timeoutMS = 1500;
const httpClient = axios.create();
httpClient.defaults.timeout = timeoutMS;

// Load environment variables
const bucketName = process.env.BUCKET_NAME || '';
let omdbToken = '';
const sqsDestination = process.env.SQS_DESTINATION || '';
const imageHeightHR = 1000;
const imageHeightLR = 200;

if (bucketName === '') {
  const msg = 'No bucket name parsed from environment.';
  logger.crit(msg);
  throw new Error(msg);
}
if (sqsDestination === '') {
  const msg = 'No SQS destination parsed from environment.';
  logger.crit(msg);
  throw new Error(msg);
}

// Define Interfaces
interface Input {
  imdbId: string;
  title: string;
  year: number;
}

interface Output {
  imdbId: string;
  year: number;
  title: string;
  director: string;
  genres: string;
  stars: string;
  runtime: string;
  ratings: {
    metascore: string;
    imdb: string;
  };
  plot: string;
  imageUrlHR: string;
  imageUrlLR: string;
}

interface ImageOuts {
  imageUrlHR: string;
  imageUrlLR: string;
}

interface MetadataOuts {
  director: string;
  genres: string;
  stars: string;
  runtime: string;
  ratings: {
    metascore: string;
    imdb: string;
  };
  plot: string;
}

/**
 * Fetch a high-res and low-res copy of a movie's poster.
 *
 * @param imdbId IMDb ID of a given movie
 */
const scrapeImage = async (imdbId: string): Promise<ImageOuts> => {
  const url = `https://img.omdbapi.com/`;

  const result = {
    imageUrlHR: `${BUCKET_HR_PREFIX}/${imdbId}.jpg`,
    imageUrlLR: `${BUCKET_LR_PREFIX}/${imdbId}.jpg`,
  };

  // Get high res image
  const params = {i: imdbId, h: imageHeightHR, apikey: omdbToken};
  let response = await httpClient.get(url, {
    params,
    decompress: false,
    // Ref: https://stackoverflow.com/a/61621094/4050261
    responseType: 'arraybuffer',
  });

  // Upload high res image to S3
  let s3params = {
    Bucket: bucketName,
    Key: result.imageUrlHR,
    Body: response.data as string,
    ContentType: 'image/jpeg',
  };

  await s3.upload(s3params).promise();

  // Get low res image
  params.h = imageHeightLR;
  response = await httpClient.get(url, {params});

  // Upload low res image to S3
  s3params = {
    Bucket: bucketName,
    Key: result.imageUrlLR,
    Body: response.data as string,
    ContentType: 'image/jpeg',
  };

  await s3.upload(s3params).promise();

  return result;
};

/**
 * Fetch all other metadata for a given movie from the OMDb API.
 *
 * @param imdbId IMDb ID of a given movie
 */
const scrapeMetadata = async (imdbId: string): Promise<MetadataOuts> => {
  const url = `https://www.omdbapi.com/`;

  // Make request
  const params = {i: imdbId, apikey: omdbToken};
  const response = await httpClient.get(url, {params});

  // Convert response
  const data = response.data as Record<string, string>;

  const output = {
    director: data.Director,
    genres: data.Genre,
    stars: data.Actors,
    runtime: data.Runtime,
    ratings: {
      metascore: data.Metascore,
      imdb: data.imdbRating,
    },
    plot: data.Plot,
  };

  return output;
};

/**
 * For a given IMDb movie, pull it's metadata and save it's poster to S3.
 */
const scrapeMovie = async (inp: Input): Promise<Output> => {
  // Make calls
  const metadata = await scrapeMetadata(inp.imdbId);
  const images = await scrapeImage(inp.imdbId);

  /// Concatenate results
  const out = {
    ...inp,
    ...metadata,
    ...images,
  };

  return out;
};

// Lambda handler
export const handler: SQSHandler = async (event: SQSEvent) => {
  try {
    // Fetch secret
    if (omdbToken === '') {
      const data = await ssm.getParameter({Name: '/dev/omdb-token', WithDecryption: true}).promise();
      omdbToken = data.Parameter?.Value || '';
    }

    await forEach(event.Records, async record => {
      // Fetch additional data
      const inp = JSON.parse(record.body) as Input;
      const out = await scrapeMovie(inp);

      // Send output to SQS
      const params = {
        MessageBody: JSON.stringify(out),
        QueueUrl: sqsDestination,
      };
      await sqs.sendMessage(params).promise();
    });
  } catch (err) {
    logger.error(`Error occured: ${err as string}`);
    throw err;
  }
};
