import * as migration_20260312_132901 from './20260312_132901';

export const migrations = [
  {
    up: migration_20260312_132901.up,
    down: migration_20260312_132901.down,
    name: '20260312_132901'
  },
];
