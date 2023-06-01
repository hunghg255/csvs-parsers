import fs from 'fs';
import fetch from 'node-fetch';
import { IOptions, csvParser } from './csvParser';

interface ICsvToJson {
  /**
   * A path name or url csv
   *
   * @default '"'
   */
  pathUrl: string;
  options?: IOptions;
}

/**
 * This function converts a CSV file to JSON format, either from a local file or a URL.
 * @param {ICsvToJson}  - The function `csvToJson` takes an object as its parameter with two
 * properties:
 * @returns A Promise that resolves to an array of objects parsed from a CSV file located at the
 * specified path URL.
 */
const csvToJson = async ({ pathUrl, options }: ICsvToJson) => {
  try {
    let readableStream: fs.ReadStream | NodeJS.ReadableStream | null;

    if (!pathUrl) throw new Error('Pathname or URL is required');

    if (pathUrl.startsWith('http')) {
      readableStream = await fetch(pathUrl).then((res) => res.body);
    } else {
      readableStream = fs.createReadStream(pathUrl);
    }

    return new Promise((resolve, reject) => {
      try {
        if (!readableStream) throw new Error('Pathname or URL is not valid');

        const results: any[] = [];

        readableStream
          .pipe(csvParser(options ?? {}))
          .on('data', (data: any) => results.push(data))
          .on('end', () => {
            resolve(results);
          })
          .on('error', (e) => {
            reject(e);
          });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    return error;
  }
};

export { csvToJson };
