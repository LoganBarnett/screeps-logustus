const { findNearbyEmptyPosition, nextId, spawn } = require('./screeps')
const {
  length,
  log,
  logJ,
  pipe,
  prop,
  tap,
} = require('./utils')

module.exports.spawnMiner = spawn('miner', [CARRY, MOVE, WORK])

const createSite = (miner) => {
  const sitePos = findNearbyEmptyPosition(null, miner.pos)
  const siteName = `construction-site-${nextId()}`
  const siteResult = miner.room.createConstructionSite(
    sitePos.x,
    sitePos.y,
    STRUCTURE_EXTENSION,
    siteName,
  )
  // console.log('-----createSite-----')
  // console.log(siteResult, sitePos)
  // console.log(JSON.stringify(Game.constructionSites, null, 2))
  // console.log(JSON.stringify(sitePos.look(), null, 2))
  // console.log(STRUCTURE_EXTENSION)
  // miner.memory.site = siteName
  // const site = miner.room.find(FIND_CONSTRUCTION_SITES)
  //   .filter(c => c.name == miner.memory.site)[0]
  return [siteResult, siteName]
}

const getOrCreateSite = (miner) => {
  if(miner.memory.site == null) {
    return createSite(miner)
  } else {
    return [ 0, miner.memory.site ]
    // const site = miner.room.find(FIND_CONSTRUCTION_SITES)
    //     .filter(c => c.name == miner.memory.site)[0]
    // if(site == null) {
    //   miner.memory.site = null
    //   return getOrCreateSite(miner)
    // } else {
    //   return [ 0, site.name ]
    // }
  }
}

// Controllers are upgraded by depositing energy into them.
const taskUpgradeController = (miner) => {
  if(miner.store.getFreeCapacity('energy') == 0) {
    miner.memory.taskStack.shift(miner.memory.task)
    miner.memory.task = 'get-energy'
  } else {
    const transferResult = miner.transfer(
      miner.room.controller,
      RESOURCE_ENERGY,
    )
    if(transferResult == ERR_NOT_IN_RANGE) {
      miner.moveTo(miner.room.controller)
    }
    if(miner.store.getUsedCapacity('energy') == 0) {
      miner.memory.task = miner.memory.taskStack.pop() || 'build-extension'
    }
  }
}

const taskBuildExtension = (miner) => {
  const [ siteResult, siteName ] = getOrCreateSite(miner)
  if(siteResult == ERR_RCL_NOT_ENOUGH) {
    miner.memory.taskStack.shift(miner.memory.task)
    miner.memory.task = 'upgrade-controller'
  } else {
    console.log('site result', siteResult)
    const site = miner.room.find(FIND_CONSTRUCTION_SITES)
      .filter(c => c.name == siteName)[0]
    // miner.memory.site = site.name
    console.log('found site', site, miner.memory.site)
    const buildResult = miner.build(site)
    switch(buildResult) {
      case 0:
        miner.memory.site = null
        miner.memory.task = miner.memory.taskStack.pop() || 'harvest'
        break
      // Move to the construction site if we're not near it.
      case ERR_NOT_IN_RANGE:
        miner.moveTo(miner.memory.site)
        break
      case ERR_NOT_ENOUGH_RESOURCES:
        // Head to spawner which should have the energy needed.
        miner.memory.taskStack.shift(miner.memory.task)
        miner.memory.task = 'get-energy'
        break
      case ERR_INVALID_TARGET:
        if(site.pos.lookFor(FIND_STRUCTURES).length > 0) {
        } else if(site.pos.lookFor(FIND_CREEPS).length > 0) {
            // Creeps block construction. Wait for it to leave.
        } else {
          // Something is seriously invalid, try building again.
          miner.memory.site = null
        }
        break
    }
  }
}

const taskGetEnergy = (miner) => {
  const spawner = Game.spawns[miner.memory.spawner]
  const harvestResult = miner.withdraw(spawner, RESOURCE_ENERGY)
  switch(harvestResult) {
    case 0:
      console.log(`Miner ${miner.name} harvested from ${spawner.name} successfully.`)
      break
    case ERR_NOT_IN_RANGE:
      miner.moveTo(spawner)
      break
    default:
      console.log('Error harvesting from spawner', harvestResult)
  }
  if(miner.store.getFreeCapacity('energy') == 0) {
    miner.memory.task = miner.memory.taskStack.pop() || 'build-extension'
  }
}

const taskHarvest = (spawner, miner) => {
  const source = miner.room.find(FIND_SOURCES)
        // .map(tap(pipe([prop('id'), log('found source')])))
    .filter(s => s.id == miner.memory.miningTarget)[0]
  // logJ('source')(source)
  if(source == null) {
    console.log('Missing the mining target', miner.memory.miningTarget)
    const sources = miner.room.find(FIND_SOURCES).filter(s => s.energy > 0)
    if(length(sources) > 0) {
      // Random assignment means it eventually gets done.
      const sourceIndex = Math.floor(Math.random() * length(sources))
      console.log('Using', sourceIndex, 'of', length(sources))
      miner.memory.miningTarget = sources[sourceIndex].id
      console.log(
        'Assigned mining target',
        miner.memory.miningTarget,
        'to',
        miner.name,
      )
    } else {
      // TODO: Find a new room.
      console.log('We broke! Find a new room')
    }
  } else {
    // console.log('found source')
    if(miner.store.getFreeCapacity() > 0) {
      if(miner.harvest(source) == ERR_NOT_IN_RANGE) {
        // console.log('moving to source')
        miner.moveTo(source)
      }
    }
    else {
      if(miner.transfer(spawner, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        // console.log('moving back to base')
        miner.moveTo(spawner)
      } else {
        console.log('transfer successful')
      }
    }
  }
}

module.exports.tickMiner = (miner) => {
  // console.log('Ticking miner ', miner.name)

  // We should assign this on creation, but I have a few holdouts that were
  // grandfathered in.
  if(miner.memory.spawner == null) {
    console.log('missing the spawner')
    miner.memory.spawner = (Game.spawns['spawn-1'] || Game.spawns['Spawn1']).name
  }
  const spawner = Game.spawns[miner.memory.spawner]
  // Same as the spawner - heal grandfathered data.
  if(miner.memory.jobType == null) {
    console.log('missing the jobType')
    miner.memory.jobType = 'miner'
  }
  if(miner.memory.taskStack == null) {
    console.log('missing the taskStack')
    miner.memory.taskStack = []
  }
  if(miner.memory.task == null) {
    miner.memory.task = 'harvest'
  }
  switch(miner.memory.task) {
    case 'build-extension':
      taskBuildExtension(miner)
      break
    case 'get-energy':
      taskGetEnergy(miner)
      break
    case 'harvest':
      taskHarvest(spawner, miner)
      break
    case 'upgrade-controller':
      taskUpgradeController()
      break
    default:
      console.log(`Task ${miner.memory.task} invalid. Falling back to harvesting.`)
      miner.memory.task = 'harvest'
      taskHarvest(spawner, miner)
  }
}
