console.log('Loading script...')

const { tickClaimer } = require('./claimer')
const { tickMiner } = require('./miner')
const { tickSpawn } = require('./spawn')
const {
  clock,
  log,
  values,
} = require('./utils')

module.exports.loop = clock(() => {
  values(Game.creeps)
    .map(c => {
      switch(c.memory.jobType) {
        case 'claimer':
          return tickClaimer(c)
        case 'miner':
          return tickMiner(c)
      }
    })
  values(Game.spawns)
    .map(tickSpawn)
  /*
  if(needBuilders()) {
    console.log('Builder:', spawnBuilder(Game.spawns['Spawn1']))
  }
  if(needMiners()) {
    console.log('Spawning miner...')
    console.log('Miner:', spawnMiner(Game.spawns['Spawn1']))
  }
  */
}, log('Main loop in ms: '))
