
// I should try to embrace Memory to see if it works for me.
const creeps = Object.assign(
  { miner: [], ferrier: [] },
  groupBy(c => c.name.split('-')[0], values(Game.creeps))
)

// All parts are sorted alphabetically for fast comparisons.
const creepPartsByType = {
  builder: [CARRY, MOVE, WORK],
  miner: [CARRY, WORK],
  ferrier: [CARRY, MOVE],
}

const creepTypeByParts = invert(toString, creepPartsByType)

const roomCircuit = (room, sourcesPathed, spawnerPos, pos) => {
  const maybeSource = s.pos.findClosestByPath(
    FIND_SOURCES,
    {
      filter: a => sourcesPathed.filter(src => src.id === a.id).length == 0,
    },
  )
  if(maybeSource == null) {
    return pos.findPathTo(spawnerPos)
  } else {
    return [pos.findPathTo(maybeSource)].concat(
      roomCircuit(
        room,
        sourcesPathed.concat([maybeSource.id]),
        spawnerPos,
        maybeSource.pos,
      ),
    )
  }
}

/**
 * Find our spawner for the room. We want a circuit between all points of
 * interest that start from the spawner and back again.
 *
 * Making a circuit is a tricky proposition. We do not know if the spawner will
 * even be in a good spot for it. However if we can achieve a one-way circuit
 * then the logic of our creeps gets significantly easier, and it mimics a
 * bloodstream of sorts.
 *
 * To build a circuit, we want to start by making a path from the spawner to the
 * closest resource. From that resource we want a path to the next resource, or
 * perhaps a separate path back to the spawner.
 *
 * Things to do:
 * + Handle the case where a spawner is not present.
 * + Handle the case where a single resource is present.
 * + Handle case where no resource is present.
 * + How to make an optimal radial path?
 */
const roomPaths = (room) => {
  room
    .find(FIND_MY_STRUCTURES)
    .filter(s => s.type == STRUCTURE_SPAWN)
    .map(s => roomCircuit(room, s.pos, s.pos))
}

const paths = mapObj(roomPaths)(Game.rooms)

/**
 * In Screeps we cannot simply get a room and look upon it. In a typical OO
 * fashion, a creep can query the room it is in but there doesn't seem to be a
 * better way of processing room data quickly. So first we get all of our creeps
 * and then gather their rooms.
 */
const sourcesFromOccupiedRooms = () => pipe([
  values,
  flatMap(values),
  flatMap(r => r.find(FIND_SOURCES)),
  tap(logJ('Resources in rooms:')),
])(Game.rooms)

const needBuilders = () => false

/**
 * Do we need miners?
 *
 * Generally we want all resources to be harvested at maximum speed. That means
 * we generally want to be spawning miners anytime we have a resource available
 * for mining. A resource can be unavailable if it is empty or it has miners
 * designated to it already (even if those miners haven't arrived yet).
 *
 * A miner is a creep with work and move parts.
 */
const needMiners = () => pipe([
  sourcesFromOccupiedRooms,
  filter(pipe([prop('energy'), gt(0)])),
  length,
  gt(0),
])

/**
 * Everything we do stems from a need. A need is something like resources,
 * roads, various structures, defenses, etc. Any spawned or constructed thing
 * should be traceable back to some need.
 */

/**
 * Jobs are tasks that spawns/constructions perform. An example job is gathering
 * resources, or building roads. Jobs can only be appointed to certain kinds of
 * creeps.
 */
const jobs = []
/**
 * Okay third stab at this: I need some way to indicate that a creep is on a
 * particular task, and some way to do this more or less statelessly. If it's'
 * stateless then I don't actually need to assign a structure to the creep.
 */
const creepToJob = creep => {
  switch(getCreepType(creep)) {
    case 'builder':
      return builderJob(creep)
    case 'miner':
      return minerJob(creep)
    case 'ferrier':
      return ferrierJob(creep)
    default:
      console.log('Not sure what to do with creep')
      // probably kill it?
  }
}

const getCreepType = creep => {
  return creepTypeByParts[creep.body.map(prop('type')).sort().toString()]
}

const builderJob = (creep) => {
  const nextPosition = {}
  const nextObjs = creep.room.lookAt(nextPosition)
  if(nextObjs.filter(o => o.type == STRUCTURE_ROAD).length > 0) {
    creep.move(nextPosition)
  } else if(nextObjs.filter(o => o.type == LOOK_CONSTRUCTION_SITES).length > 0) {
    creep.build(site)
  } else {
    const site = creep.room.createConstructionSite(nextPosition, STRUCTURE_ROAD)
    creep.build(site)
  }
}

const minerJob = (creep) => creep
  .harvest(creep.pos.findClosestByRange(Game.SOURCES))

const ferrierJob = (creep) => {
  const closestCreep = creep.pos.findInRange(Game.CREEPS, 1)[0]
  if(closestCreep != null && closestCreep.store.getCapacity() == 0) {
    switch(getCreepType(closestCreep)) {
      case 'builder':
        creep.transfer(closestCreep, RESOURCE_ENERGY)
        break
      case 'miner':
        creep.pull(closestCreep)
        break
    }
  }
  const closestResource = creep.pos.findInRange(Game.RESOURCES, 1)[0]
  if(closestResource != null) {
    creep.pickup(closestResource)
  }

  // Where do we move?
}

/**
 * Builders go to appointed build sites and construct things there.
 *
 * Currently a builder can only build miners.
 */
const spawnBuilder = spawn('builder', [CARRY, MOVE, WORK])

/**
 * Miners go to a resource and harvest it. Once they arrive at a resource they
 * should remain there until the resource is depleted.
 *
 * Miners need CARRY to have a capacity but do not use it to ferry the resources
 * around. Ferriers fill this role in conjunction with miners to provide a
 * resource chain.
 */
const spawnMiner = spawn('miner', [CARRY, MOVE, WORK])

/**
 * Ferriers collect supplies from miners and return them to the spawner.
 */
const spawnFerrier = spawn('ferrier', [CARRY, MOVE])
