import { csvToJson } from '../dist/index.mjs';

(async () => {
  try {
    const r = await csvToJson({
      pathUrl:
        'https://hurricanes.ral.ucar.edu/realtime/plots/northwestpacific/2023/wp022023/bwp022023.dat',
      options: {},
    });
    console.log(r);
  } catch (error) {
    console.log(error.message);
  }
})();
