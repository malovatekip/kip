/* Business-structure scenes, one per idea category (kip_prompt_v2 slugs).
   Coordinates live in an 800 x 340 viewBox; each node is a 132 x 62 card centred
   on (x, y). `metric` binds the node's live value (see BusinessFlowScene).
   Link kinds: goods (teal), money (gold), people (violet), labor (green),
   info (blue). `bend` curves a link (+/- pixels off the straight line).
   `motif` picks the animated backdrop; `accent` tints the node icons. */
import {
  Sprout, Wheat, Store, Users, Coins, Megaphone, ShoppingBasket, ChefHat, UtensilsCrossed,
  Wallet, Truck, Package, ShoppingCart, Inbox, PenTool, Palette, Eye, Send, Share2, Wrench,
  ShieldCheck, KeyRound, Banknote, HeartPulse, CalendarCheck, Handshake, Landmark, Calculator,
  ArrowLeftRight, PiggyBank, Smartphone, Fuel, MapPin, PackageCheck, Boxes, Factory, BedDouble,
  Compass, Globe, BrickWall, HardHat, Building2, BookOpen, School, ClipboardCheck, Award,
  Settings2, Receipt, Warehouse,
} from 'lucide-react'

const N = (id, label, Icon, x, y, metric) => ({ id, label, Icon, x, y, metric })
const L = (from, to, kind, bend = 0) => ({ from, to, kind, bend })

export const SCENES = {
  agriculture: {
    motif: 'field', accent: 'var(--green)',
    nodes: [
      N('seed', 'Seed & feed', Sprout, 92, 82, 'bought'),
      N('hands', 'Farm hands', Users, 92, 258, 'staff'),
      N('field', 'Field & pens', Wheat, 300, 170, 'stock'),
      N('stall', 'Market stall', Store, 512, 170, 'served'),
      N('buyers', 'Buyers', Users, 708, 82, 'demand'),
      N('cash', 'Cash box', Coins, 708, 258, 'revenue'),
      N('radio', 'Radio & SMS', Megaphone, 512, 300, 'ad'),
    ],
    links: [
      L('seed', 'field', 'goods', -18), L('hands', 'field', 'labor', 18), L('field', 'stall', 'goods'),
      L('buyers', 'stall', 'people', -16), L('stall', 'cash', 'money', 16), L('radio', 'buyers', 'info', -60),
    ],
  },
  food_and_catering: {
    motif: 'steam', accent: 'var(--gold)', steamAt: [300, 118],
    nodes: [
      N('market', 'Market supplier', ShoppingBasket, 92, 86, 'bought'),
      N('cooks', 'Cooks', Users, 92, 256, 'staff'),
      N('kitchen', 'Kitchen', ChefHat, 300, 170, 'stock'),
      N('counter', 'Serving counter', UtensilsCrossed, 512, 170, 'served'),
      N('diners', 'Diners', Users, 708, 86, 'demand'),
      N('till', 'Till', Wallet, 708, 256, 'revenue'),
      N('promo', 'Promos', Megaphone, 512, 300, 'ad'),
    ],
    links: [
      L('market', 'kitchen', 'goods', -14), L('cooks', 'kitchen', 'labor', 14), L('kitchen', 'counter', 'goods'),
      L('diners', 'counter', 'people', -16), L('counter', 'till', 'money', 16), L('promo', 'diners', 'info', -70),
    ],
  },
  retail_and_trade: {
    motif: 'shelves', accent: 'var(--teal)',
    nodes: [
      N('wholesale', 'Wholesaler', Truck, 88, 170, 'bought'),
      N('stockroom', 'Stockroom', Package, 268, 78, 'stock'),
      N('shelves', 'Shelves', Store, 448, 170, 'served'),
      N('shoppers', 'Shoppers', Users, 708, 78, 'demand'),
      N('checkout', 'Checkout', ShoppingCart, 652, 262, 'revenue'),
      N('staff', 'Shop staff', Users, 268, 262, 'staff'),
    ],
    links: [
      L('wholesale', 'stockroom', 'goods', -10), L('stockroom', 'shelves', 'goods', -10),
      L('shoppers', 'shelves', 'people', -24), L('shelves', 'checkout', 'money', 18),
      L('staff', 'shelves', 'labor', 14), L('wholesale', 'staff', 'info', 26),
    ],
  },
  digital_and_creative: {
    motif: 'grid', accent: 'var(--violet)',
    nodes: [
      N('briefs', 'Client briefs', Inbox, 92, 90, 'demand'),
      N('team', 'Freelancers', Users, 92, 252, 'staff'),
      N('assets', 'Licences & kit', PenTool, 300, 52, 'bought'),
      N('studio', 'Studio', Palette, 300, 186, 'stock'),
      N('review', 'Review', Eye, 512, 186, 'served'),
      N('deliver', 'Delivery', Send, 708, 112, 'served'),
      N('invoices', 'Invoices', Receipt, 708, 262, 'revenue'),
      N('socials', 'Socials', Share2, 512, 302, 'ad'),
    ],
    links: [
      L('briefs', 'studio', 'people', -14), L('team', 'studio', 'labor', 14), L('assets', 'studio', 'goods'),
      L('studio', 'review', 'goods'), L('review', 'deliver', 'goods', -12), L('review', 'invoices', 'money', 12),
      L('socials', 'briefs', 'info', 70),
    ],
  },
  trades_and_repairs: {
    motif: 'gears', accent: 'var(--gold)',
    nodes: [
      N('parts', 'Parts supplier', Package, 92, 84, 'bought'),
      N('techs', 'Technicians', Users, 92, 256, 'staff'),
      N('workshop', 'Workshop', Wrench, 298, 170, 'stock'),
      N('customers', 'Customers', Smartphone, 506, 62, 'demand'),
      N('qc', 'Quality check', ShieldCheck, 506, 252, 'served'),
      N('handover', 'Handover', KeyRound, 708, 170, 'served'),
      N('pay', 'Payments', Banknote, 708, 296, 'revenue'),
    ],
    links: [
      L('parts', 'workshop', 'goods', -14), L('techs', 'workshop', 'labor', 14), L('customers', 'workshop', 'people', 18),
      L('workshop', 'qc', 'goods', -16), L('qc', 'handover', 'goods', -14), L('handover', 'pay', 'money', 10),
    ],
  },
  services_and_care: {
    motif: 'pulse', accent: 'var(--red)',
    nodes: [
      N('supplies', 'Supplies', Package, 92, 84, 'bought'),
      N('carers', 'Carers', Users, 92, 256, 'staff'),
      N('room', 'Care room', HeartPulse, 300, 170, 'stock'),
      N('bookings', 'Bookings', CalendarCheck, 512, 66, 'demand'),
      N('served', 'Clients served', Handshake, 512, 256, 'served'),
      N('pay', 'Payments', Wallet, 708, 170, 'revenue'),
      N('refer', 'Referrals', Share2, 708, 50, 'ad'),
    ],
    links: [
      L('supplies', 'room', 'goods', -14), L('carers', 'room', 'labor', 14), L('bookings', 'room', 'people', -18),
      L('room', 'served', 'goods', 16), L('served', 'pay', 'money', 14), L('refer', 'bookings', 'info', -10),
    ],
  },
  finance_and_administration: {
    motif: 'ticker', accent: 'var(--gold)',
    nodes: [
      N('float', 'Float & capital', Landmark, 92, 86, 'bought'),
      N('tellers', 'Tellers', Users, 92, 256, 'staff'),
      N('desk', 'Agent desk', Calculator, 300, 170, 'stock'),
      N('txn', 'Transactions', ArrowLeftRight, 512, 170, 'served'),
      N('customers', 'Customers', Users, 708, 80, 'demand'),
      N('commission', 'Commission', PiggyBank, 708, 262, 'revenue'),
      N('sms', 'SMS & posters', Smartphone, 512, 46, 'ad'),
    ],
    links: [
      L('float', 'desk', 'goods', -14), L('tellers', 'desk', 'labor', 14), L('desk', 'txn', 'goods'),
      L('customers', 'txn', 'people', -14), L('txn', 'commission', 'money', 14), L('sms', 'customers', 'info', 10),
    ],
  },
  transport_and_logistics: {
    motif: 'road', accent: 'var(--blue)',
    nodes: [
      N('fuel', 'Fuel & parts', Fuel, 92, 76, 'bought'),
      N('drivers', 'Drivers', Users, 92, 264, 'staff'),
      N('fleet', 'Fleet', Truck, 292, 170, 'stock'),
      N('route', 'Route', MapPin, 494, 170, 'served'),
      N('drops', 'Drop points', PackageCheck, 704, 92, 'served'),
      N('shippers', 'Shippers', Users, 704, 256, 'demand'),
      N('fares', 'Fares', Coins, 494, 296, 'revenue'),
    ],
    links: [
      L('fuel', 'fleet', 'goods', -14), L('drivers', 'fleet', 'labor', 14), L('fleet', 'route', 'goods'),
      L('route', 'drops', 'goods', -14), L('shippers', 'route', 'people', 14), L('route', 'fares', 'money', 0),
    ],
  },
  manufacturing: {
    motif: 'conveyor', accent: 'var(--teal)',
    nodes: [
      N('raw', 'Raw materials', Boxes, 92, 80, 'bought'),
      N('ops', 'Operators', Users, 92, 260, 'staff'),
      N('line', 'Production line', Factory, 294, 170, 'stock'),
      N('finished', 'Finished goods', PackageCheck, 496, 84, 'served'),
      N('dist', 'Distributors', Truck, 696, 170, 'served'),
      N('buyers', 'Buyers', Users, 696, 298, 'demand'),
      N('sales', 'Sales', Banknote, 496, 262, 'revenue'),
    ],
    links: [
      L('raw', 'line', 'goods', -14), L('ops', 'line', 'labor', 14), L('line', 'finished', 'goods', -12),
      L('finished', 'dist', 'goods', -12), L('buyers', 'dist', 'people', -12), L('dist', 'sales', 'money', 14),
    ],
  },
  tourism_and_hospitality: {
    motif: 'waves', accent: 'var(--violet)',
    nodes: [
      N('supplies', 'Supplies', ShoppingBasket, 92, 86, 'bought'),
      N('hosts', 'Hosts', Users, 92, 256, 'staff'),
      N('lodge', 'Lodge & rooms', BedDouble, 298, 170, 'stock'),
      N('trips', 'Experiences', Compass, 504, 236, 'served'),
      N('guests', 'Guests', Globe, 708, 84, 'demand'),
      N('pay', 'Payments', Wallet, 708, 268, 'revenue'),
      N('reviews', 'Reviews & ads', Megaphone, 504, 70, 'ad'),
    ],
    links: [
      L('supplies', 'lodge', 'goods', -14), L('hosts', 'lodge', 'labor', 14), L('guests', 'lodge', 'people', -30),
      L('lodge', 'trips', 'goods', 12), L('trips', 'pay', 'money', 8), L('reviews', 'guests', 'info', -8),
    ],
  },
  construction_and_real_estate: {
    motif: 'crane', accent: 'var(--gold)',
    nodes: [
      N('yard', 'Materials yard', BrickWall, 92, 90, 'bought'),
      N('crew', 'Crew', HardHat, 92, 264, 'staff'),
      N('site', 'Site', Building2, 296, 186, 'stock'),
      N('build', 'Build progress', Settings2, 496, 108, 'served'),
      N('handover', 'Handover', KeyRound, 704, 108, 'served'),
      N('clients', 'Clients', Handshake, 704, 262, 'demand'),
      N('pay', 'Stage payments', Banknote, 496, 284, 'revenue'),
    ],
    links: [
      L('yard', 'site', 'goods', -14), L('crew', 'site', 'labor', 14), L('site', 'build', 'goods', -10),
      L('build', 'handover', 'goods'), L('clients', 'site', 'people', 26), L('handover', 'pay', 'money', 30),
    ],
  },
  education_and_training: {
    motif: 'chalk', accent: 'var(--blue)',
    nodes: [
      N('materials', 'Materials', BookOpen, 92, 86, 'bought'),
      N('tutors', 'Tutors', Users, 92, 256, 'staff'),
      N('class', 'Classroom', School, 298, 170, 'stock'),
      N('tests', 'Assessments', ClipboardCheck, 500, 246, 'served'),
      N('grads', 'Graduates', Award, 708, 246, 'served'),
      N('learners', 'Learners', Users, 708, 84, 'demand'),
      N('fees', 'Fees', Wallet, 500, 72, 'revenue'),
    ],
    links: [
      L('materials', 'class', 'goods', -14), L('tutors', 'class', 'labor', 14), L('learners', 'class', 'people', -20),
      L('class', 'tests', 'goods', 12), L('tests', 'grads', 'goods'), L('class', 'fees', 'money', -10),
    ],
  },
  _default: {
    motif: 'grid', accent: 'var(--blue)',
    nodes: [
      N('suppliers', 'Suppliers', Truck, 92, 86, 'bought'),
      N('team', 'Team', Users, 92, 256, 'staff'),
      N('ops', 'Operations', Warehouse, 298, 170, 'stock'),
      N('sales', 'Sales point', Store, 508, 170, 'served'),
      N('customers', 'Customers', Users, 708, 86, 'demand'),
      N('cash', 'Cash', Wallet, 708, 256, 'revenue'),
    ],
    links: [
      L('suppliers', 'ops', 'goods', -14), L('team', 'ops', 'labor', 14), L('ops', 'sales', 'goods'),
      L('customers', 'sales', 'people', -16), L('sales', 'cash', 'money', 16),
    ],
  },
}

export function sceneFor(category) {
  return SCENES[category] || SCENES._default
}

/* Map a shock name to an overlay effect. */
export function shockEffect(name = '') {
  const n = name.toLowerCase()
  if (/flood|rain|storm|water|wash/.test(n)) return 'rain'
  if (/power|load|electric|outage|blackout|zesco/.test(n)) return 'bolt'
  if (/disease|outbreak|pest|virus|flu|sick|infect|swine|bird/.test(n)) return 'hazard'
  if (/drought|heat|dry|fire/.test(n)) return 'heat'
  return 'alert'
}
