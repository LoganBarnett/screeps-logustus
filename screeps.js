const {
  addC,
  always,
  concatC,
  defaultTo,
  eq,
  identity,
  ifElse,
  left,
  length,
  logJ,
  map,
  max,
  pipe,
  prop,
  right,
  tap,
  values,
} = require('./utils')

const posFromDir = (dir, pos) => {
  switch(dir) {
    case 'n':
      return new RoomPosition(pos.x, pos.y + 1, pos.roomName)
    case 'ne':
      return new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName)
    case 'e':
      return new RoomPosition(pos.x + 1, pos.y, pos.roomName)
    case 'se':
      return new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName)
    case 's':
      return new RoomPosition(pos.x, pos.y - 1, pos.roomName)
    case 'sw':
      return new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName)
    case 'w':
      return new RoomPosition(pos.x - 1, pos.y, pos.roomName)
    case 'nw':
      return new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName)
  }

  // Can't do it this way, because we have to move twice along a side.
  // If it's the same position, we're at the start.
  // if(pos.x == lastPos.x && pos.y == lastPos.y) {
  //   return new RoomPosition(pos.x, pos.y + 1, pos.roomName)
  // } else if(pos.x == lastPos.x && pos.y == lastPos.y + 1) {
  //   return new RoomPosition(pos.x + 1, pos.y, pos.roomName)
  // } else if(pos.x == lastPos.x + 1 && pos.y == lastPos.y) {
  //   return new RoomPosition(pos.x, pos.y - 1, pos.roomName)
  // } else if(pos.x == lastPos.x && pos.y == lastPos.y - 1) {
  //   return new RoomPosition(pos.x - 1, pos.y, pos.roomName)
  // } else if(pos.x == lastPos.x && pos.y == lastPos.y - 1) {
  //   return new RoomPosition(pos.x - 1, pos.y, pos.roomName)
  // }
}

const dirs = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
]

const nextDir = d => {
  const i = dirs.indexOf(d)
  return i == -1 || i == dirs.length - 1 ? 'n' : dirs[i+1]
}

module.exports.findNearbyEmptyPosition = (dir, pos) => {
  const roomObjs = pos.look()
  console.log('looking at ', pos.x, pos.y)
  // logJ('roomObjs')(roomObjs)
  if(roomObjs.length == 1 &&
      roomObjs[0].type == 'terrain' &&
      roomObjs[0].terrain == 'plain'
  ) {
    console.log('Found something clear, done.')
    return pos
  } else {
    if(nextDir(dir) == 'n' && dir == 'ne') {
      console.log('wrapped')
      // This means we wrapped around, so now we need to shift the relative.
      return module.exports.findNearbyEmptyPosition(null, posFromDir('n', pos))
    } else {
      return module.exports.findNearbyEmptyPosition(
        nextDir(dir),
        posFromDir(nextDir(dir), pos),
      )
    }
  }
}

/**
 * Spawns/creeps must be uniquely named. But we really don't care about their
 * names? Convoluted, yes, but not necessary to be performant since it's
 * infrequently used.
 */
module.exports.nextId = () => pipe([
  values,
  concatC(values(Game.spawns)),
  concatC(values(Game.structures)),
  // Sometimes an empty object winds up in here? Throw it out.
  // filter(x => x == {}),
  ifElse(
    pipe([length, eq(0)]),
    always(0),
    pipe([
      map(pipe([prop('name'), defaultTo('unknown-0')])),
      map(k => k.split('-')[1]),
      map(defaultTo('0')),
      map(tap(logJ('string'))),
      map(s => parseInt(s)),
      map(
        ifElse(
          Number.isNaN,
          always(0),
          identity,
        ),
      ),
      max,
      addC(1),
    ]),
  ),
])(Game.creeps)


/**
 * A generic, semi-functional-style spawn function.
 */
module.exports.spawn = (type, parts) => spawner => {
  const name = `${type}-${module.exports.nextId().toString()}`
  const code = spawner.spawnCreep(parts, name)
  const result = ifElse(
    eq(0),
    // pipe([/*tap(() => creeps[type].push(Game.creeps[name])),*/ right]),
    right,
    pipe([
      module.exports.spawnCodeToError(spawner, name),
      message => ({ code, message }),
      left,
    ]),
  )(code)
  console.log(`Spawn result for ${type}`, result)
  return result.map((c) => {
    const creep = Game.creeps[name]
    creep.memory.jobType = type
    creep.memory.spawner = spawner.name
    creep.memory.taskStack = []
    return creep
  })
}

module.exports.spawnCodeToError = (spawner, name) => code => {
  switch(code) {
    case -3:
      return `Name '${name}' exists.`
    case -4:
      return `Spawner '${spawner.name} is busy (probably spawning something else)!`
    case -6:
      return
        `Spawner '${spawner.name}' needs more resources to spawn '${name}'!`
    default:
      return `Make a friendly error message for code ${code}!`
  }
}
