# CSV Parsers

[![npm version](https://badge.fury.io/js/csvs-parsers.svg)](https://badge.fury.io/js/csvs-parsers) [![npm](https://img.shields.io/npm/dw/csvs-parsers.svg?logo=npm)](https://www.npmjs.com/package/csvs-parsers) [![npm](https://img.shields.io/bundlephobia/minzip/csvs-parsers)](https://www.npmjs.com/package/csvs-parsers)
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

## Install

```bash
npm i csvs-parsers@latest
```

With `yarn`

```bash
yarn add csvs-parsers@latest
```

## Use

```js
import { csvToJson } from 'csvs-parsers';


const start = async () => {
 const results = await csvToJson({
    pathUrl: url // path name or URL vsv,
  });
}

start();
```
