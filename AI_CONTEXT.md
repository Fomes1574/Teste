# AI Context - Imperio de Monstros

## Regras permanentes do projeto

- Jogo: Imperio de Monstros.
- Visual desejado: dark fantasy 16-bit premium.
- Prioridade de UX: menos texto solto, mais reacao visual.
- A tela Principal deve focar o palco vivo, o ritual e paineis compactos.
- A loja completa deve ficar na aba Monstros.
- Producao detalhada, cliques do ritual e estatisticas devem ficar na aba Estatisticas.
- Nunca resetar save sem autorizacao explicita do jogador.
- Nunca alterar a chave do localStorage sem autorizacao explicita.
- Nunca chamar clearSave fora do fluxo confirmado de reset.
- Nunca fazer push, merge na main, PR ou publicar GitHub Pages sem autorizacao explicita.
- Testar localmente antes de qualquer publicacao.

## Direcao de trabalho

- Phaser deve ser tratado como camada visual; a economia principal continua sendo a fonte da verdade.
- Nao alterar balanceamento, custos, producao ou estrutura de save sem uma tarefa explicita para isso.
- Preferir evolucao visual do mundo a mensagens narrativas repetitivas.
- Manter o palco DOM antigo como fallback seguro ate o palco Phaser real estar aprovado.
