# Proxima tarefa - Fase 4A: StageScene Real Minima

## Objetivo

Trocar a cena de debug PHASER OK por uma StageScene real minima, sem alterar economia, save ou layout principal.

## Regras

- Definir STAGE_DEBUG=false.
- Remover a cena visual PHASER OK do fluxo normal.
- Manter Phaser ativo e validado.
- Manter o palco DOM antigo como fallback seguro.
- Nao implementar sons.
- Nao implementar conquistas.
- Nao alterar economia, custos, producao ou balanceamento.
- Nao alterar save nem localStorage key.

## Implementacao esperada

- Criar um fundo Phaser simples e bonito, em dark fantasy 16-bit.
- Usar sprites locais existentes de goblin, skeleton e hero-knight.
- Posicionar o heroi no lado direito.
- Posicionar goblin e esqueleto no lado esquerdo quando existirem no state.
- Fazer o clique no pentagrama gerar um pulso visual no palco.
- Manter animacoes leves e seguras, sem combate complexo.

## Criterios de aceite

- Phaser continua renderizando sem fallback indevido.
- O palco nao fica preto.
- O jogo continua funcionando ao clicar no pentagrama.
- Abas continuam funcionando.
- Build passa.
- Nenhuma feature nova fora da StageScene real minima e adicionada.
