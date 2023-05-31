import fs from 'fs';
import needle from 'needle';

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
const csvToJson = ({ pathUrl, options }: ICsvToJson) => {
  return new Promise((resolve, reject) => {
    try {
      const results: any[] = [];

      if (!pathUrl) reject(new Error('Path Url is not valid'));

      let readableStream: fs.ReadStream | NodeJS.ReadableStream;

      if (pathUrl.startsWith('http')) {
        readableStream = needle.get(pathUrl);
      } else {
        readableStream = fs.createReadStream(pathUrl);
      }

      if (!readableStream) reject(new Error('Path Url is not valid'));

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
};

export { csvToJson };
