export const SAVE_KEY = "dark-path-prototype-save-v2";

export const rarities = [
  { key: "common", name: "Обычный", color: "#b8b8aa", power: 1, value: 18, stats: 1 },
  { key: "uncommon", name: "Необычный", color: "#73d27a", power: 1.35, value: 38, stats: 2 },
  { key: "rare", name: "Редкий", color: "#62a8ff", power: 1.8, value: 75, stats: 3 },
  { key: "epic", name: "Эпический", color: "#b16dff", power: 2.45, value: 140, stats: 4 },
  { key: "legendary", name: "Легендарный", color: "#ffb84d", power: 3.25, value: 260, stats: 5 },
  { key: "mythic", name: "Мифический", color: "#ff5f8f", power: 4.15, value: 460, stats: 6 },
  { key: "ancient", name: "Древний", color: "#53e2c5", power: 5.15, value: 780, stats: 7 },
  { key: "divine", name: "Божественный", color: "#f8f1a8", power: 6.35, value: 1280, stats: 8 },
  { key: "relic", name: "Реликвия", color: "#ffffff", power: 8, value: 2200, stats: 9 },
];

export const slots = [
  { key: "weapon", name: "Оружие", stats: ["damage", "crit", "combo"] },
  { key: "talisman", name: "Талисман", stats: ["lifeSteal", "bleed", "accuracy"] },
  { key: "helmet", name: "Шлем", stats: ["health", "armor", "accuracy"] },
  { key: "chest", name: "Нагрудник", stats: ["health", "armor"] },
  { key: "boots", name: "Сапоги", stats: ["evasion", "accuracy", "armor"] },
  { key: "necklace", name: "Ожерелье", stats: ["crit", "lifeSteal", "health"] },
  { key: "ring", name: "Кольцо", stats: ["damage", "crit", "bleed"] },
  { key: "shoulder", name: "Наплечник", stats: ["armor", "combo", "damage"] },
];

export const heroClasses = [
  {
    key: "dark_knight",
    name: "Тёмный рыцарь",
    desc: "Броня и похищение жизни. Выдерживает длинные бои.",
    bonuses: { armor: 4, lifeSteal: 0.04, health: 18 },
  },
  {
    key: "hunter",
    name: "Охотник",
    desc: "Крит и кровотечение. Быстро добивает элит.",
    bonuses: { crit: 0.06, bleed: 0.05, damage: 3 },
  },
  {
    key: "cultist",
    name: "Культист",
    desc: "Комбо и звёздный взрыв. Чем дольше бой, тем сильнее.",
    bonuses: { combo: 0.06, damage: 2 },
    starHitsRequired: 4,
  },
];

export const enemyArchetypes = {
  beast: { visual: "beast", traits: ["Быстрый"] },
  knight: { visual: "knight", traits: ["Бронированный"] },
  demon: { visual: "demon", traits: ["Агрессивный"] },
  ghost: { visual: "ghost", traits: ["Призрак"] },
};

export const locations = [
  {
    name: "Черный Лес",
    tint: "forest",
    mobs: [
      { name: "Гнилой волк", archetype: "beast" },
      { name: "Лесной упырь", archetype: "ghost" },
      { name: "Шипастый культист", archetype: "demon" },
      { name: "Слепой охотник", archetype: "beast" },
    ],
  },
  {
    name: "Разбитая Цитадель",
    tint: "castle",
    mobs: [
      { name: "Ржавый рыцарь", archetype: "knight" },
      { name: "Костяной страж", archetype: "knight" },
      { name: "Пепельный арбалетчик", archetype: "hunter" },
      { name: "Падший знаменосец", archetype: "demon" },
    ],
  },
  {
    name: "Пылающее Подземелье",
    tint: "dungeon",
    mobs: [
      { name: "Огненный бес", archetype: "demon" },
      { name: "Лавовый мясник", archetype: "knight" },
      { name: "Дымный призрак", archetype: "ghost" },
      { name: "Кузнец без лица", archetype: "demon" },
    ],
  },
  {
    name: "Мертвые Врата",
    tint: "abyss",
    mobs: [
      { name: "Судья тьмы", archetype: "ghost" },
      { name: "Пожиратель клятв", archetype: "demon" },
      { name: "Безымянный зверь", archetype: "beast" },
      { name: "Вестник пустоты", archetype: "ghost" },
    ],
  },
  {
    name: "Проклятые Болота",
    tint: "swamp",
    mobs: [
      { name: "Трясинный тролль", archetype: "beast" },
      { name: "Ядовитый жрец", archetype: "demon" },
      { name: "Гнилая нимфа", archetype: "ghost" },
      { name: "Болотный змей", archetype: "beast" },
    ],
  },
  {
    name: "Ледяной Склеп",
    tint: "ice",
    mobs: [
      { name: "Ледяной ревенант", archetype: "ghost" },
      { name: "Замерзший палач", archetype: "knight" },
      { name: "Снежная тень", archetype: "ghost" },
      { name: "Хранитель морозов", archetype: "knight" },
    ],
  },
  {
    name: "Багровая Пустошь",
    tint: "wasteland",
    mobs: [
      { name: "Песчаный скорпион", archetype: "beast" },
      { name: "Багровый берсерк", archetype: "demon" },
      { name: "Пустынный некромант", archetype: "ghost" },
      { name: "Красный голем", archetype: "knight" },
    ],
  },
  {
    name: "Небесная Руина",
    tint: "celestial",
    mobs: [
      { name: "Падший ангел", archetype: "ghost" },
      { name: "Хранитель руин", archetype: "knight" },
      { name: "Небесный каратель", archetype: "demon" },
      { name: "Живой колосс", archetype: "knight" },
    ],
  },
];

export const statLabels = {
  damage: "Урон",
  health: "Здоровье",
  combo: "Комбо",
  armor: "Броня",
  crit: "Крит",
  evasion: "Уклонение",
  accuracy: "Точность",
  lifeSteal: "Похищение",
  bleed: "Кровотечение",
};

export const percentStats = new Set(["combo", "crit", "evasion", "accuracy", "lifeSteal", "bleed"]);

export const synergyDefs = [
  {
    key: "blood_pact",
    name: "Кровавый пакт",
    needs: { bleed: 0.12, lifeSteal: 0.06 },
    bonus: { bleed: 0.04, lifeSteal: 0.03 },
  },
  {
    key: "assassin",
    name: "Убийца",
    needs: { combo: 0.2, crit: 0.14 },
    bonus: { crit: 0.05, combo: 0.04 },
  },
  {
    key: "fortress",
    name: "Крепость",
    needs: { armor: 14, health: 180 },
    bonus: { armor: 3, health: 24 },
  },
];

export const setBonusByRarity = {
  uncommon: [
    { count: 2, label: "Пара необычных", bonus: { damage: 2 } },
    { count: 4, label: "Опытный исследователь", bonus: { accuracy: 0.03 } },
  ],
  rare: [
    { count: 2, label: "Пара редких", bonus: { crit: 0.03 } },
    { count: 4, label: "Редкая коллекция", bonus: { armor: 2 } },
  ],
  epic: [
    { count: 2, label: "Пара эпических", bonus: { combo: 0.04 } },
    { count: 4, label: "Эпическая эссенция", bonus: { crit: 0.03 } },
  ],
  legendary: [
    { count: 2, label: "Пара легендарных", bonus: { lifeSteal: 0.03 } },
    { count: 4, label: "Легендарный комплект", bonus: { damage: 4 } },
  ],
  mythic: [
    { count: 2, label: "Пара мифических", bonus: { bleed: 0.04 } },
    { count: 4, label: "Мифическая ярость", bonus: { combo: 0.02, crit: 0.02 } },
  ],
  ancient: [
    { count: 2, label: "Пара древних", bonus: { armor: 2, health: 20 } },
    { count: 4, label: "Древняя мощь", bonus: { health: 40 } },
  ],
  divine: [
    { count: 2, label: "Пара божественных", bonus: { damage: 5, crit: 0.04 } },
    { count: 4, label: "Божественный дар", bonus: { armor: 4 } },
  ],
  relic: [
    { count: 2, label: "Пара реликвий", bonus: { damage: 8, health: 40, crit: 0.05 } },
    { count: 4, label: "Реликтовый синтез", bonus: { bleed: 0.05, lifeSteal: 0.03 } },
  ],
};

export const tutorialSteps = [
  {
    title: "Тёмная дорога",
    text: "Герой сражается автоматически. Проходи 5 встреч, чтобы завершить сектор и полностью исцелиться.",
  },
  {
    title: "Лут и решения",
    text: "После боёв выпадает снаряжение. Сравнивай статы и надевай лучшее. События требуют выбора.",
  },
  {
    title: "Души и боссы",
    text: "Отправляй души в Рай (защита) или Ад (агрессия). Пять душ открывают босса с редкой добычей.",
  },
  {
    title: "Звёзды и синергии",
    text: "Каждые 5 улучшений — звезда. Собирай билды: кровотечение + похищение, комбо + крит, броня + HP.",
  },
];

export const milestoneDefs = [
  { key: "sector_10", check: (s) => s.sector >= 10, title: "Сектор 10", text: "Тропа становится опаснее." },
  { key: "sector_25", check: (s) => s.sector >= 25, title: "Сектор 25", text: "Редкий лут встречается чаще." },
  { key: "sector_50", check: (s) => s.sector >= 50, title: "Сектор 50", text: "Ты прошёл половину пути тьмы." },
  { key: "sector_100", check: (s) => s.sector >= 100, title: "Сектор 100", text: "Легенда тёмной дороги." },
  { key: "first_heaven", check: (s) => s.stats.heavenBosses >= 1, title: "Серафим повержен", text: "Врата Рая открыты." },
  { key: "first_hell", check: (s) => s.stats.hellBosses >= 1, title: "Палач повержен", text: "Врата Ада открыты." },
  { key: "epic_set", check: (s) => s.stats.epicSlots >= 6, title: "Эпический доспех", text: "Шесть эпических слотов собрано." },
];

export const itemTypes = {
  weapon: [
    { key: "sword", name: "меч", visual: "sword" },
    { key: "axe", name: "топор", visual: "axe" },
    { key: "dagger", name: "кинжал", visual: "dagger" },
    { key: "scythe", name: "коса", visual: "scythe" },
  ],
  talisman: [
    { key: "orb", name: "сфера", visual: "orb" },
    { key: "tome", name: "книга", visual: "tome" },
    { key: "skull", name: "череп", visual: "skull" },
    { key: "crystal", name: "кристалл", visual: "crystal" },
  ],
  helmet: [
    { key: "iron_helm", name: "железный шлем", visual: "iron_helm" },
    { key: "crown", name: "корона", visual: "crown" },
    { key: "hood", name: "капюшон", visual: "hood" },
    { key: "bone_mask", name: "костяная маска", visual: "bone_mask" },
  ],
  chest: [
    { key: "plate", name: "латы", visual: "plate" },
    { key: "chainmail", name: "кольчуга", visual: "chainmail" },
    { key: "robe", name: "мантия", visual: "robe" },
    { key: "dragon_scale", name: "чешуя дракона", visual: "dragon_scale" },
  ],
  boots: [
    { key: "iron_boots", name: "железные сапоги", visual: "iron_boots" },
    { key: "leather_boots", name: "кожаные сапоги", visual: "leather_boots" },
    { key: "shadow_boots", name: "теневые сапоги", visual: "shadow_boots" },
    { key: "fire_boots", name: "огненные сапоги", visual: "fire_boots" },
  ],
  necklace: [
    { key: "pendant", name: "кулон", visual: "pendant" },
    { key: "amulet", name: "амулет", visual: "amulet" },
    { key: "chain_necklace", name: "цепь", visual: "chain_necklace" },
    { key: "choker", name: "чокер", visual: "choker" },
  ],
  ring: [
    { key: "signet", name: "печатка", visual: "signet" },
    { key: "band", name: "кольцо", visual: "band" },
    { key: "gem_ring", name: "самоцветное кольцо", visual: "gem_ring" },
    { key: "bone_ring", name: "костяное кольцо", visual: "bone_ring" },
  ],
  shoulder: [
    { key: "pauldron", name: "латный наплечник", visual: "pauldron" },
    { key: "fur_mantle", name: "меховая мантия", visual: "fur_mantle" },
    { key: "spike_guard", name: "шипастый наплечник", visual: "spike_guard" },
    { key: "cape", name: "плащ", visual: "cape" },
  ],
};

export const events = [
  {
    key: "altar",
    kind: "Алтарь выбора",
    title: "Темный алтарь требует крови",
    text: "Можно получить силу до конца сектора, но алтарь заберет часть здоровья.",
    choices: [
      { label: "+15% урона", effectKey: "altar_damage" },
      { label: "+12% брони", effectKey: "altar_armor" },
      { label: "+8% крита", effectKey: "altar_crit" },
    ],
  },
  {
    key: "chest",
    kind: "Проклятый сундук",
    title: "Сундук шепчет имя героя",
    text: "Открыть можно бесплатно. Иногда внутри лут, иногда мимик.",
    choices: [
      { label: "Открыть", effectKey: "chest_open" },
      { label: "Пройти мимо", effectKey: "chest_pass" },
    ],
  },
  {
    key: "forge",
    kind: "Кузница",
    title: "Старая кузница еще дышит жаром",
    text: "Кузнечный огонь может усилить героя или выдать новый предмет.",
    choices: [
      { label: "Заплатить 80 G", effectKey: "forge_pay" },
      { label: "Не тратить золото", effectKey: "forge_skip" },
    ],
  },
  {
    key: "soul",
    kind: "Плененная душа",
    title: "Душа висит над тропой",
    text: "Рай исцеляет и защищает. Ад усиливает урон и кровотечение.",
    choices: [
      { label: "Отправить в Рай", effectKey: "soul_heaven" },
      { label: "Отправить в Ад", effectKey: "soul_hell" },
    ],
  },
  {
    key: "shrine",
    kind: "Святилище",
    title: "Каменное святилище светится изнутри",
    text: "Можно восстановиться или обменять здоровье на золото.",
    choices: [
      { label: "Исцелиться", effectKey: "shrine_heal" },
      { label: "Взять золото", effectKey: "shrine_gold" },
    ],
  },
  {
    key: "trap",
    kind: "Ловушка",
    title: "Плиты под ногами щелкают",
    text: "Уклонение помогает избежать урона. Если повезет, герой найдет тайник.",
    choices: [{ label: "Проверить путь", effectKey: "trap_check" }],
  },
  {
    key: "crossroad",
    kind: "Развилка",
    title: "Тропа делится на три темных прохода",
    text: "Безопасный путь даёт золото. Элитный бой — сильный враг. Риск — лут или бой.",
    choices: [
      { label: "Безопасный путь", effectKey: "cross_safe" },
      { label: "Элитный бой", effectKey: "cross_elite" },
      { label: "Рискнуть", effectKey: "cross_risk" },
    ],
  },
  {
    key: "pact",
    kind: "Проклятый пакт",
    title: "Темная сделка",
    text: "Пожертвуй частью здоровья ради гарантированного редкого предмета или возьми золото, сохранив силы.",
    choices: [
      { label: "Жертвовать ради лута", effectKey: "pact_loot" },
      { label: "Забрать золото", effectKey: "pact_gold" },
    ],
  },
  {
    key: "relic",
    kind: "Проклятый реликт",
    title: "Древний артефакт лежит в пыли",
    text: "Сила старого реликвия отдаст тебе бонус, но придётся заплатить кровью.",
    choices: [
      { label: "Взрыв крови", effectKey: "relic_power" },
      { label: "Стальной страж", effectKey: "relic_guard" },
    ],
  },
  {
    key: "cache",
    kind: "Тайник",
    title: "Найден тайник странника",
    text: "Здесь можно быстро заработать золото или скрыться в тени и немного восстановиться.",
    choices: [
      { label: "Забрать золото", effectKey: "cache_gold" },
      { label: "Отдохнуть", effectKey: "cache_heal" },
    ],
  },
  {
    key: "market",
    kind: "Призрачный торговец",
    title: "Торговец без лица предлагает сделку",
    text: "Купить предмет за золото или оставить путь открыт — шанс на элитный бой.",
    choices: [
      { label: "Купить предмет", effectKey: "market_item" },
      { label: "Пойти дальше", effectKey: "market_run" },
    ],
  },
  {
    key: "oath",
    kind: "Клятва",
    title: "Пять слов, заключенных в крови",
    text: "Скажи клятву и получи временный бонус, но следующий бой может стать сложнее.",
    choices: [
      { label: "Клятва крови", effectKey: "oath_buff" },
      { label: "Сохранить путь", effectKey: "oath_safe" },
    ],
  },
  {
    key: "vision",
    kind: "Видение",
    title: "Тень показывает путь вперед",
    text: "Одно видение откроет слабость врагов или поможет найти скрытый клад.",
    choices: [
      { label: "Увидеть слабость", effectKey: "vision_debuff" },
      { label: "Найти клад", effectKey: "vision_gold" },
    ],
  },
];

export const slotEmojis = {
  weapon: "⚔️",
  talisman: "🔮",
  helmet: "🪖",
  chest: "🛡️",
  boots: "👢",
  necklace: "📿",
  ring: "💍",
  shoulder: "⚜️",
};

export const itemEmojis = {
  sword: "⚔️",
  mace: "🔨",
  axe: "🪓",
  spear: "🔱",
  dagger: "🗡️",
  staff: "🪄",
  katana: "⚔️",
  scythe: "⚔️",
  orb: "🔮",
  relic: "✨",
  tome: "📖",
  idol: "🗿",
  skull: "💀",
  crystal: "💎",
  iron_helm: "🪖",
  crown: "👑",
  hood: "🧥",
  bone_mask: "💀",
  horned_helm: "🪖",
  plate: "🛡️",
  chainmail: "🛡️",
  robe: "👘",
  leather: "🧥",
  dragon_scale: "🐉",
  iron_boots: "👢",
  leather_boots: "👢",
  shadow_boots: "🥾",
  fire_boots: "🔥",
  pendant: "📿",
  amulet: "🧿",
  chain_necklace: "⛓️",
  choker: "📿",
  signet: "💍",
  band: "💍",
  gem_ring: "💎",
  bone_ring: "🦴",
  pauldron: "⚜️",
  fur_mantle: "🧣",
  spike_guard: "⚜️",
  cape: "🧣",
};

export const artifacts = [
  {
    id: "stone_heart",
    name: "Каменное сердце",
    rarity: "common",
    description: "+15% здоровью. Снижает воздействие кровотечения на 20%.",
    stats: { health: 0.15 },
  },
  {
    id: "vampiric_fang",
    name: "Вампирский клык",
    rarity: "uncommon",
    description: "+12% похищению жизни. Каждое исцеление даёт +1% урона до конца боя.",
    stats: { lifeSteal: 0.12 },
  },
  {
    id: "night_vision",
    name: "Ночное зрение",
    rarity: "uncommon",
    description: "+18% точности. +8% крита против быстрых врагов.",
    stats: { accuracy: 0.18 },
  },
  {
    id: "blood_edge",
    name: "Кровавое лезвие",
    rarity: "rare",
    description: "+20% кровотечению. Кровотечение наносит урон чаще на 25%.",
    stats: { bleed: 0.20 },
  },
  {
    id: "razor_focus",
    name: "Боевой фокус",
    rarity: "rare",
    description: "+25% крита. Каждый крит восстанавливает 2% здоровья.",
    stats: { crit: 0.25 },
  },
  {
    id: "iron_skin",
    name: "Железная кожа",
    rarity: "rare",
    description: "+22% броне. Каждый полученный удар снижает входящий урон на 1% (накапливается).",
    stats: { armor: 0.22 },
  },
  {
    id: "shadow_dance",
    name: "Танец теней",
    rarity: "epic",
    description: "+30% уклонению. +15% скорости атаки.",
    stats: { evasion: 0.30 },
  },
  {
    id: "blessing_ruin",
    name: "Благословение руин",
    rarity: "epic",
    description: "+28% урону и комбо. Босс Рая даёт +40% больше опыта.",
    stats: { damage: 0.28, combo: 0.28 },
  },
  {
    id: "curse_echo",
    name: "Эхо проклятия",
    rarity: "epic",
    description: "+35% кровотечению и похищению жизни. Босс Ада даёт +40% больше золота.",
    stats: { bleed: 0.35, lifeSteal: 0.35 },
  },
  {
    id: "ancient_codex",
    name: "Древний кодекс",
    rarity: "legendary",
    description: "Все статы +20%. Каждый уровень сектора даёт +2% ко всем бонусам.",
    stats: { damage: 0.20, health: 0.20, crit: 0.20, armor: 0.20, accuracy: 0.20 },
  },
];

export const BALANCE = {
  tickMs: 1550,
  upgradeBase: 75,
  upgradeGrowth: 1.22,
  rerollCostBase: 45,
  sectorsPerLocation: 20,
  eventChance: 0.32,
  eventChanceLast: 0.08,
  eventChanceMax: 0.48,
  eventChanceGrowth: 0.0008,
  eliteChance: 0.12,
  eliteChanceMax: 0.30,
  eliteChanceGrowth: 0.0009,
};

export const storyEvents = [
  {
    key: "lore_intro_knight",
    kind: "Сюжет (Акт 1)",
    title: "Встреча у костра",
    text: "Старик в изодранном плаще сидит у костра.\n\n«Я вижу, ты из тех, кто собирает Души... Знаешь ли ты, что если собрать пять Душ Рая или Ада, можно открыть Врата? И еще... вещи, выкованные в одной кузне, резонируют друг с другом.»",
    choices: [
      { label: "Слушать и запомнить", effectKey: "unlock_bosses" }
    ]
  },
  {
    key: "moral_deserter",
    kind: "Моральный выбор",
    title: "Раненый солдат",
    text: "Ты находишь дезертира из вражеской армии. Он истекает кровью и умоляет о помощи, проклиная войну, в которую его бросили.",
    choices: [
      { label: "Перевязать рану (+Человечность)", effectKey: "deserter_help" },
      { label: "Добить врага (+Жестокость, +Золото)", effectKey: "deserter_kill" }
    ]
  },
  {
    key: "moral_patrol",
    kind: "Моральный выбор",
    title: "Патруль Короны",
    text: "Патруль твоего королевства преграждает путь. Командир смотрит на тебя с подозрением: «Кто таков? Предъяви бумаги!»",
    choices: [
      { label: "Солгать и спрятаться (+Сомнение)", effectKey: "patrol_lie" },
      { label: "Показать Приказ и Письмо (+Лояльность)", effectKey: "patrol_truth" }
    ]
  }
];
