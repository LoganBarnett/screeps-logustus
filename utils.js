/**
 * This is some hodge-podge union of fantasy land stuff with Ramda, all done
 * without auto currying or a PhD in computer science.
 */

const add2 = (x, y) => x + y
const addC = x => y => x + y
const always = x => () => x
const apply = f => a => f(a)
const clock = (f, report) => {
  const startTime = Date.now()
  const result = f()
  report(Date.now() - startTime)
  return result
}
const concatC = xs => ys => xs.concat(ys)
const concat2 = (xs, ys) => xs.concat(ys)
const curry = fn => (...args) => {
  if(fn.length < args.length) {
    return curry(fn.bind(null, ...args))
  } else {
    return fn(...args)
  }
}
const defaultTo = d => x => x == null ? d : x
const eq = curry(x => y => x === y)
const flatMap = f => xs => xs.map(f).reduce(concat2, [])
const filter = f => xs => xs.filter(f)
const flip = f => (x, y) => f(y, x)
const groupBy = split => xs => {
  const r = {}
  xs.forEach(x => {
    const key = split(x)
    if(r[key] == null) {
      r[key] = [x]
    } else {
      r[key].push(x)
    }
  })
  return r
}
const gt = x => y => x > y
const ifElse = (cond, tBody, fBody) => x => cond(x) ? tBody(x) : fBody(x)
const identity = x => x
const invert = toKey => i => {
  const o = {}
  for(let k in i) {
    o[k] = toKey(i)
  }
  return o
}
const keys = Object.keys
const length = xs => xs.length
const map = f => xs => xs.map(f)
const mapObj = f => i => {
  const o = {}
  for(let k in i) {
    o[k] = f(i[k])
  }
  return o
}
const max = xs => Math.max(...xs)
// I tried this with ...inputs but it didn't work when ...inputs[0] was []. It
// added an element somehow.
const pipe = fns => (input) => fns.reduce((args, f) => f(args), input)
const log = t => (...args) => console.log(t, ...args)
const logJ = t => (...args) => console.log(
  t,
  // No args is a special case (undefined).
  ...(args.length == 0 ? ['undefined'] : args.map(a => JSON.stringify(a, null, 2))),
)
const lt = x => y => x < y
const prop = p => o => o[p]
const tap = f => x => { f(x); return x }
const toString = x => x.toString()
const values = Object.values
const valuesScreeps = xs => {
  const ys = []
  for(let x in xs) {
    ys.push(x)
  }
  return ys
}

const left = x => ({
  map: () => left(x),
  pattern: (left, right) => left(x),
  toString: () => `Left(${JSON.stringify(x)})`,
})

const right = x => ({
  // TODO: convert to left if returned.
  map: f => right(f(x)),
  pattern: (left, right) => right(x),
  toString: () => `Right(${JSON.stringify(x)})`,
})

module.exports = {
  add2,
  addC,
  always,
  apply,
  clock,
  concatC,
  concat2,
  curry,
  defaultTo,
  eq,
  groupBy,
  gt,
  filter,
  flip,
  flatMap,
  ifElse,
  identity,
  invert,
  left,
  length,
  log,
  logJ,
  lt,
  map,
  mapObj,
  max,
  pipe,
  prop,
  right,
  tap,
  toString,
  values,
  valuesScreeps,
}
