// The hair salon and the toy shop: Arianna saves for them in the building fund jar, Builder Bo builds
// them on the town's two empty lots, and then they open on bonus days. They add to the game and never
// change the cupcake shop: a shop day doesn't use up a day of the cupcake season.

export const SHOPS = {
  salon: {name: "Arianna's Hair Salon", short: 'Hair salon', icon: '✂️', cost: 100, lot: 1, color: '#c3a6ec', trim: '#f7a8c8'},
  toy:   {name: "Arianna's Toy Shop", short: 'Toy shop', icon: '🧸', cost: 220, lot: 0, color: '#86c3f2', trim: '#ffd66b'},
};
export const ORDER = ['salon', 'toy'];   // the jar saves for these in turn
export const FUND_AFTER = 4;             // the jar shows up once day 4 is done
export const KEEP_CASH = 30;             // always left over for the next trip to the market
export const DROPS = [5, 10];
export const MAX_BOOKED = 5;

export const freshShops = () => ({fund: 0, built: [], building: null, booked: {}, log: []});

export const fundOpen = save => save.day > FUND_AFTER || save.shops.fund > 0 || save.shops.built.length > 0;
// what the jar is saving for now, or null while Builder Bo is busy or both shops are built
export const fundFor = save => (save.shops.building ? null : ORDER.find(id => !save.shops.built.includes(id)) || null);

// Drop money into the jar. Never takes more than the shop still needs, or the money kept for the market.
export function drop(save, amount) {
  const id = fundFor(save);
  if (!id) return 'none';
  const take = Math.min(amount, SHOPS[id].cost - save.shops.fund);
  if (save.cash - take < KEEP_CASH) return 'keep';
  save.cash -= take;
  save.shops.fund += take;
  if (save.shops.fund < SHOPS[id].cost) return 'ok';
  save.shops.fund = 0;
  save.shops.building = id;   // built overnight; she sees it go up the next morning
  return 'full';
}
export const canDrop = (save, amount) => {
  const id = fundFor(save);
  return !!id && save.cash - Math.min(amount, SHOPS[id].cost - save.shops.fund) >= KEEP_CASH;
};

export function finishBuilding(save) {
  const id = save.shops.building;
  if (!id) return null;
  save.shops.built.push(id);
  save.shops.building = null;
  save.shops.booked[id] = 3;   // the first customers are waiting on opening day
  return id;
}

// Each cupcake day, word gets round and another customer books a visit to each shop.
export function afterCupcakeDay(save) {
  for (const id of save.shops.built) save.shops.booked[id] = Math.min(MAX_BOOKED, (save.shops.booked[id] || 0) + 1);
}
export const booked = (save, id) => save.shops.booked[id] || 0;

// which empty lot each built (or building) shop stands on
export function lotsTaken(save) {
  const out = {};
  for (const id of save.shops.built) out[SHOPS[id].lot] = id;
  return out;
}
