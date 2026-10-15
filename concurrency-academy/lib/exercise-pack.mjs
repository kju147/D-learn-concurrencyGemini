import { strToU8, zipSync } from 'fflate';

// Only known file names, no user-controlled archive paths.
export function makeExercisePack(code, tests, readme) {
  return zipSync({
    'start-join/src/OrderImport.java': strToU8(code),
    'start-join/src/StartJoinTests.java': strToU8(tests),
    'start-join/README.md': strToU8(readme),
  });
}
