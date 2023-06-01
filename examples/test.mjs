import { csvToJson } from '../dist/index.mjs';

(async () => {
  try {
    const r = await csvToJson({
      pathUrl: 'examples/test1.csv',
    });
    console.log(r);
  } catch (error) {
    console.log('error.message', error.message);
  }
})();
