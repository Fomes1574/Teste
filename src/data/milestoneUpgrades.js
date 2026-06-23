import { PRODUCER_DEFINITIONS } from './producers.js';

export const MILESTONE_COST_FACTORS = {
  25: 1.2,
  50: 1.4,
  75: 1.7,
  100: 2.2,
  defaultMid: 2.8,
  1000: 5,
  future: 2
};

export const MILESTONE_MULTIPLIERS = {
  25: 2,
  50: 2,
  75: 2,
  100: 3,
  500: 2.5,
  1000: 5,
  defaultMid: 2,
  future: 1.75
};

export const MILESTONE_STEPS = [25, 50, 75, 100, 200, 300, 400, 500, 1000];

const names = {
  goblin: ['Ladrões de Aldeia', 'Saqueadores de Ouro', 'Bolsos Sem Fundo', 'Rei da Sarjeta', 'Guilda dos Dedos Verdes', 'Rotas de Pilhagem', 'Mercado de Almas Roubadas', 'Bandeira da Horda Baixa', 'Coroa do Primeiro Goblin'],
  skeleton: ['Fileira de Ossos', 'Lanças do Túmulo', 'Marcha Sem Pulso', 'Muralha de Fêmures', 'Legião Sem Sono', 'Ossário Marchante', 'Patrulha do Cemitério', 'Bastião do Ossário', 'Exército do Rei Morto'],
  witch: ['Caldeirões Fumegantes', 'Maldição de Vilarejo', 'Coro das Bruxas', 'Lua no Caldeirão', 'Pacto das Treze', 'Vassouras de Cinza', 'Receita de Almas', 'Tempestade de Agulhas', 'Sabbat da Noite Vermelha'],
  necromancer: ['Círculo de Aprendizes', 'Grimórios Empilhados', 'Coral dos Mortos', 'Conselho Cadavérico', 'Escola da Carne Fria', 'Arquivos do Túmulo', 'Doutores da Putrefação', 'Biblioteca de Ossos', 'Sínodo dos Liches Menores'],
  gargoyle: ['Olhos de Pedra', 'Telhados Vigiados', 'Garras de Catedral', 'Voo das Ruínas', 'Sentinelas do Crepúsculo', 'Beirais Profanos', 'Torres Mordidas', 'Fortaleza Alada', 'Céu de Pedra Viva'],
  demon: ['Contratos em Sangue', 'Assinaturas Queimadas', 'Advogados do Abismo', 'Pacto de Mil Línguas', 'Cartório Infernal', 'Selos de Enxofre', 'Dívidas Eternas', 'Tribunal das Chamas', 'Arquiduque dos Pactos'],
  dragon: ['Rastro de Cinzas', 'Asas Sobre a Vila', 'Sopro de Almas', 'Covil no Eclipse', 'Revoada Espectral', 'Escamas de Névoa', 'Rugido da Lua Vermelha', 'Céu dos Dragões Mortos', 'O Primeiro Wyrm Retorna'],
  portal: ['Fresta Ardente', 'Garganta do Abismo', 'Vórtice de Gritos', 'Boca do Inferno', 'Fenda Estável', 'Maré de Monstros', 'Horizonte Rasgado', 'Portal das Mil Garras', 'Cicatriz do Mundo'],
  lich: ['Coroa Rachada', 'Cajado de Ossos Nobres', 'Decreto dos Mortos', 'Trono do Lich', 'Corte Cadavérica', 'Decreto Sem Fim', 'Imposto de Almas', 'Reino Sem Pulso', 'Imperador do Túmulo'],
  god: ['Correntes Trêmulas', 'Olho Entreaberto', 'Sussurro Colossal', 'Primeira Ruptura', 'Dedos no Horizonte', 'Voz Sob a Terra', 'Algemas Partidas', 'O Mundo Inclina', 'O Deus Respira']
};

function costFactorFor(milestone) {
  return MILESTONE_COST_FACTORS[milestone] || (milestone > 1000 ? MILESTONE_COST_FACTORS.future : MILESTONE_COST_FACTORS.defaultMid);
}

function multiplierFor(milestone) {
  return MILESTONE_MULTIPLIERS[milestone] || (milestone > 1000 ? MILESTONE_MULTIPLIERS.future : MILESTONE_MULTIPLIERS.defaultMid);
}

function milestoneCost(producer, milestone) {
  return Math.ceil(producer.baseCost * Math.pow(milestone, 2.15) * costFactorFor(milestone));
}

export const MILESTONE_UPGRADE_DEFINITIONS = PRODUCER_DEFINITIONS.flatMap(producer =>
  MILESTONE_STEPS.map((milestone, index) => ({
    id: `${producer.id}_milestone_${milestone}`,
    producerId: producer.id,
    milestone,
    name: names[producer.id][index],
    description: `${producer.name} no marco ${milestone}: produção deste produtor x${multiplierFor(milestone)}.`,
    multiplier: multiplierFor(milestone),
    cost: milestoneCost(producer, milestone),
    unlock: state => (state.producers[producer.id] || 0) >= milestone
  }))
);
