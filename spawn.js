const { spawnClaimer } = require('./claimer')
const { spawnMiner } = require('./miner')
const {
  identity,
  left,
  log,
  logJ,
  pipe,
  right,
  tap,
} = require('./utils')

module.exports.tickSpawn = (spawn) => {
  const capacity = spawn.store.getFreeCapacity(RESOURCE_ENERGY)
  if(capacity == 0) {
    console.log('spawner has surplus...')
    // Surplus, best spend it.

    const controller = spawn.room.controller
    if(controller.progress < controller.progressTotal) {
      console.log('spawning claimer!')
      spawnClaimer(spawn).pattern(
        left => {
          if(left.code == -6) {
            console.log('Need more resources to build claimer. Building extensions.')
            // For now, make a builder each time.
            const minerResult = spawnMiner(spawn)
            logJ('miner')(minerResult)
            minerResult.pattern(
              tap(log('Cannot spawn builder')),
              pipe([
                tap(log('Spawned builder for extensions')),
                tap(miner => miner.memory.task = 'build-extension'),
              ])
            )
          }
        },
        pipe([
          tap(log('Claimer spawning...')),
          identity
        ]),
      )
    } else {
      console.log(
        'No claimers needed, we have total control ',
        controller.progress,
        '/',
        controller.totalProgress,
      )
    }
  } else {
    console.log('spawner has capacity', capacity)
  }
}
