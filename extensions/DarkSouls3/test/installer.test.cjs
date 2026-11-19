require('./suite.cjs')(
  require('../dist/DarkSouls3/index.cjs'),
  { appid: 374320, executable: 'Game/DarkSoulsIII.exe' },
)
