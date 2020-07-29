const { spawn } = require('./screeps')

module.exports.spawnClaimer = spawn('claimer', [CLAIM, MOVE])

module.exports.tickClaimer = claimer => {
  if(claimer.claimController(claimer.room.controller) == ERR_NOT_IN_RANGE) {
    claimer.moveTo(claimer.room.controller)
  } // TODO: Handle other problems.
  // TODO: Handle claimed scenario
}
