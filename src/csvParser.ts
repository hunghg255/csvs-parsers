import { Transform } from 'stream';

export interface IOptions {
  /**
   * A single-character string used to specify the character used to escape strings in a CSV row.
   *
   * @default '"'
   */
  readonly escape?: string;

  /**
   * Specifies the headers to use. Headers define the property key for each value in a CSV row. If no `headers` option is provided, `csv-parser` will use the first line in a CSV file as the header specification.
   *
   * If `false`, specifies that the first row in a data file does _not_ contain headers, and instructs the parser to use the row index as the key for each row.
   *
   * Suppose you have a CSV file `data.csv` which contains the data:
   *
   * ```
NAME,AGE
Daffy Duck,24
Bugs Bunny,22
```
   * Using `headers: false` with the data from `data.csv` would yield:
   * ```
[
{ '0': 'Daffy Duck', '1': 24 },
{ '0': 'Bugs Bunny', '1': 22 }
]
```
   */
  readonly headers?: ReadonlyArray<string> | boolean;

  /**
   * A function that can be used to modify the values of each header. Return `null` to remove the header, and it's column, from the results.
   *
   * @example
   *
   * csv({
   *   mapHeaders: ({ header, index }) => header.toLowerCase()
   * });
   */
  readonly mapHeaders?: (args: { header: string; index: number }) => string | null;

  /**
   * A function that can be used to modify the value of each column value.
   *
   * @example
   *
   * csv({
   *   mapValues: ({ header, index, value }) => value.toLowerCase()
   * });
   */
  readonly mapValues?: (args: { header: string; index: number; value: any }) => any;

  /**
   * Specifies a single-character string to denote the end of a line in a CSV file.
   *
   * @default '\n'
   */
  readonly newline?: string;

  /**
   * Specifies a single-character string to denote a quoted string.
   *
   * @default '"'
   */
  readonly quote?: string;

  /**
   * If `true`, instructs the parser not to decode UTF-8 strings.
   */
  readonly raw?: boolean;

  /**
   * Specifies a single-character string to use as the column separator for each row.
   *
   * @default ','
   */
  readonly separator?: string;

  /**
   * Instructs the parser to ignore lines which represent comments in a CSV file. Since there is no specification that dictates what a CSV comment looks like, comments should be considered non-standard. The "most common" character used to signify a comment in a CSV file is `"#"`. If this option is set to `true`, lines which begin with `#` will be skipped. If a custom character is needed to denote a commented line, this option may be set to a string which represents the leading character(s) signifying a comment line.
   *
   * @default false
   */
  readonly skipComments?: boolean | string;

  /**
   * Specifies the number of lines at the beginning of a data file that the parser should skip over, prior to parsing headers.
   *
   * @default 0
   */
  readonly skipLines?: number;

  /**
   * Maximum number of bytes per row. An error is thrown if a line exeeds this value. The default value is on 8 peta byte.
   *
   * @default Number.MAX_SAFE_INTEGER
   */
  readonly maxRowBytes?: number;

  /**
   * If `true`, instructs the parser that the number of columns in each row must match the number of `headers` specified.
   */
  readonly strict?: boolean;
}

const [cr] = Buffer.from('\r');
const [nl] = Buffer.from('\n');

const defaults = {
  escape: '"',
  headers: null,
  mapHeaders: ({ header }: any) => header,
  mapValues: ({ value }: any) => value,
  newline: '\n',
  quote: '"',
  raw: false,
  separator: ',',
  skipComments: false,
  skipLines: null,
  maxRowBytes: Number.MAX_SAFE_INTEGER,
  strict: false,
};

/* The CsvParser class is a TypeScript implementation of a parser for CSV files. */
class CsvParser extends Transform {
  _prev: any;
  state: any;
  options: any;
  headers: any;

  constructor(opts = {}) {
    super({ objectMode: true, highWaterMark: 16 });

    if (Array.isArray(opts)) opts = { headers: opts };

    const options: any = Object.assign({}, defaults, opts);

    options.customNewline = options.newline !== defaults.newline;

    for (const key of ['newline', 'quote', 'separator']) {
      if (typeof options[key] !== 'undefined') {
        [options[key]] = Buffer.from(options[key]);
      }
    }

    // if escape is not defined on the passed options, use the end value of quote
    options.escape = ((opts || {}) as any).escape ? Buffer.from(options.escape)[0] : options.quote;

    this.state = {
      empty: options.raw ? Buffer.alloc(0) : '',
      escaped: false,
      first: true,
      lineNumber: 0,
      previousEnd: 0,
      rowLength: 0,
      quoted: false,
    } as any;

    this._prev = null;

    if (options.headers === false) {
      // enforce, as the column length check will fail if headers:false
      options.strict = false;
    }

    if (options.headers || options.headers === false) {
      this.state.first = false;
    }

    this.options = options;
    this.headers = options.headers;
  }

  parseCell(buffer: Buffer, start: number, end: number) {
    const { escape, quote } = this.options;
    // remove quotes from quoted cells
    if (buffer[start] === quote && buffer[end - 1] === quote) {
      start++;
      end--;
    }

    let y = start;

    for (let i = start; i < end; i++) {
      // check for escape characters and skip them
      if (buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote) {
        i++;
      }

      if (y !== i) {
        buffer[y] = buffer[i];
      }
      y++;
    }

    return this.parseValue(buffer, start, y);
  }

  parseLine(buffer: Buffer, start: number, end: number) {
    const {
      customNewline,
      escape,
      mapHeaders,
      mapValues,
      quote,
      separator,
      skipComments,
      skipLines,
    } = this.options;

    end--; // trim newline
    if (!customNewline && buffer.length && buffer[end - 1] === cr) {
      end--;
    }

    const comma = separator;
    const cells = [];
    let isQuoted = false;
    let offset = start;

    if (skipComments) {
      const char = typeof skipComments === 'string' ? skipComments : '#';
      if (buffer[start] === Buffer.from(char)[0]) {
        return;
      }
    }

    const mapValue = (value: any) => {
      if (this.state.first) {
        return value;
      }

      const index = cells.length;
      const header = this.headers[index];

      return mapValues({ header, index, value });
    };

    for (let i = start; i < end; i++) {
      const isStartingQuote = !isQuoted && buffer[i] === quote;
      const isEndingQuote =
        isQuoted && buffer[i] === quote && i + 1 <= end && buffer[i + 1] === comma;
      const isEscape = isQuoted && buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote;

      if (isStartingQuote || isEndingQuote) {
        isQuoted = !isQuoted;
        continue;
      } else if (isEscape) {
        i++;
        continue;
      }

      if (buffer[i] === comma && !isQuoted) {
        let value = this.parseCell(buffer, offset, i);
        value = mapValue(value);

        cells.push(value);
        offset = i + 1;
      }
    }

    if (offset < end) {
      let value = this.parseCell(buffer, offset, end);
      value = mapValue(value);
      cells.push(value);
    }

    if (buffer[end - 1] === comma) {
      cells.push(mapValue(this.state.empty));
    }

    const skip = skipLines && skipLines > this.state.lineNumber;
    this.state.lineNumber++;

    if (this.state.first && !skip) {
      this.state.first = false;
      this.headers = cells.map((header, index) => mapHeaders({ header, index }));

      this.emit('headers', this.headers);
      return;
    }

    if (!skip && this.options.strict && cells.length !== this.headers.length) {
      const e = new RangeError(
        `Row length does not match headers, Headers need to a array with ${cells.length} element`,
      );
      this.emit('error', e);
    } else {
      if (!skip) this.writeRow(cells);
    }
  }

  parseValue(buffer: Buffer, start: number, end: number) {
    if (this.options.raw) {
      return buffer.slice(start, end);
    }

    return buffer.toString('utf-8', start, end);
  }

  writeRow(cells: any) {
    const headers =
      this.headers === false ? cells.map((value: any, index: number) => index) : this.headers;

    const row = cells.reduce((o: { [x: string]: any }, cell: any, index: number) => {
      const header = headers[index];
      if (header === null) return o; // skip columns
      if (header !== undefined && header.trim()) {
        o[header] = `${cell}`.trim();
      } else {
        o[`_EMPTY_${index + 1}`] = `${cell}`.trim();
      }
      return o;
    }, {});

    this.push(row);
  }

  _flush(cb: () => void) {
    if (this.state.escaped || !this._prev) return cb();
    this.parseLine(this._prev, this.state.previousEnd, this._prev.length + 1); // plus since online -1s
    cb();
  }

  _transform(
    data:
      | string
      | any[]
      | readonly number[]
      | { valueOf(): string | Uint8Array | readonly number[] }
      | null,
    enc: any,
    cb: (params?: any) => void,
  ) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }

    const { escape, quote } = this.options;
    let start = 0;
    let buffer: any = data;

    if (this._prev) {
      start = this._prev.length;
      buffer = Buffer.concat([this._prev, data]);
      this._prev = null;
    }

    const bufferLength = buffer.length;

    for (let i = start; i < bufferLength; i++) {
      const chr = buffer[i];
      const nextChr = i + 1 < bufferLength ? buffer[i + 1] : null;

      this.state.rowLength++;
      if (this.state.rowLength > this.options.maxRowBytes) {
        return cb(new Error('Row exceeds the maximum size'));
      }

      if (!this.state.escaped && chr === escape && nextChr === quote && i !== start) {
        this.state.escaped = true;
        continue;
      } else if (chr === quote) {
        if (this.state.escaped) {
          this.state.escaped = false;
          // non-escaped quote (quoting the cell)
        } else {
          this.state.quoted = !this.state.quoted;
        }
        continue;
      }

      if (!this.state.quoted) {
        if (this.state.first && !this.options.customNewline) {
          if (chr === nl) {
            this.options.newline = nl;
          } else if (chr === cr) {
            if (nextChr !== nl) {
              this.options.newline = cr;
            }
          }
        }

        if (chr === this.options.newline) {
          this.parseLine(buffer, this.state.previousEnd, i + 1);
          this.state.previousEnd = i + 1;
          this.state.rowLength = 0;
        }
      }
    }

    if (this.state.previousEnd === bufferLength) {
      this.state.previousEnd = 0;
      return cb();
    }

    if (bufferLength - this.state.previousEnd < (data as any).length) {
      this._prev = data;
      this.state.previousEnd -= bufferLength - (data as any).length;
      return cb();
    }

    this._prev = buffer;
    cb();
  }
}

/**
 * This is a TypeScript function that creates a new instance of a CSV parser with optional
 * configuration options.
 * @param {IOptions} [opts] - opts is an optional parameter of type IOptions that can be passed to the
 * CsvParser constructor. It allows the user to customize the behavior of the CsvParser by specifying
 * options such as the delimiter character, the quote character, and whether or not to treat the first
 * row as a header row. If no
 */
const csvParser = (opts?: IOptions) => new CsvParser(opts);

export { csvParser };
