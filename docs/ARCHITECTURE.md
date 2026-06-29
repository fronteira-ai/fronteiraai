# PLATFORM ALIGNMENT — DOMAIN_MODEL.md

## CONTEXTO

A Foundation Empresarial está oficialmente CERTIFICADA.

O ARCHITECTURE.md foi atualizado e representa corretamente a arquitetura do ParaguAI após o Release 1.4.

Agora devemos alinhar o DOMAIN_MODEL.md.

Este documento NÃO deve ser apenas um espelho do banco de dados.

Ele deve explicar o modelo de domínio do ParaguAI.

Diferença importante:

DATABASE = implementação física.

DOMAIN MODEL = conhecimento do negócio.

---

# MISSÃO

Reescrever completamente:

docs/DOMAIN_MODEL.md

Transformando-o na principal referência sobre o domínio do ParaguAI.

---

# OBJETIVO

Responder:

Quais entidades existem?

Por que elas existem?

Como elas se relacionam?

Qual responsabilidade pertence a cada uma?

Como o domínio pode crescer sem perder consistência?

---

# LEITURA OBRIGATÓRIA

Antes de escrever:

* AI_CONSTITUTION.md
* BUSINESS_MODEL.md
* ENGINEERING_PRINCIPLES.md
* PRODUCT_PRINCIPLES.md
* ARCHITECTURE.md
* DATABASE/DATABASE.md
* DATABASE/ERD.md
* Todas as migrations
* Todos os services
* Todos os types
* Todos os ADRs relacionados ao banco

Documentar somente o que realmente existe.

---

# O DOCUMENTO DEVERÁ CONTER

## 1. Filosofia do Modelo de Domínio

Explicar que o domínio representa conhecimento.

Não tecnologia.

Não SQL.

Não Supabase.

---

## 2. Grandes Contextos do ParaguAI

Separar claramente.

Exemplo:

Marketplace

Merchant

Acquisition

Catálogo

Busca

Analytics

IA

Administração

Turismo (preparação futura)

Explicar cada contexto.

---

## 3. Entidades

Para cada entidade:

Propósito.

Responsabilidade.

Quem pode alterá-la.

Quem depende dela.

Relacionamentos.

Não listar apenas colunas.

---

## 4. Relacionamentos

Explicar as relações de negócio.

Produto → Oferta.

Loja → Merchant.

Merchant → Plano.

Importação → Produtos.

Analytics → Eventos.

Etc.

---

## 5. Ciclo de Vida

Explicar como nasce.

Como evolui.

Como é utilizada.

Como pode ser arquivada.

Para cada entidade importante.

---

## 6. Agregados

Identificar agregados naturais.

Explicar limites.

Evitar acoplamento.

---

## 7. Invariantes

Registrar regras permanentes.

Exemplo:

Slug único.

Oferta pertence a uma loja.

Produto pertence a uma categoria.

Merchant possui plano.

Etc.

---

## 8. Fluxo do Conhecimento

Mostrar como um dado percorre o domínio.

Conector

↓

Importação

↓

Normalização

↓

Produto

↓

Oferta

↓

Busca

↓

Usuário

↓

Analytics

↓

IA

---

## 9. Crescimento

Explicar como o domínio suporta:

novos países;

novas cidades;

novos conectores;

novos marketplaces;

novos módulos.

---

## 10. Anti-Patterns

Evitar:

duplicação;

entidades sem responsabilidade;

relacionamentos ambíguos;

campos sem significado.

---

## 11. Futuras Extensões

Registrar apenas pontos claramente previstos.

Sem inventar funcionalidades.

---

## 12. Conclusão

Explicar por que um bom modelo de domínio é um ativo estratégico.

---

# IMPORTANTE

Não transformar o documento em um dump do banco.

Ele deve explicar o negócio.

Não apenas a estrutura física.

---

# QUALITY GATE

Somente concluir se:

✔ representar corretamente o Release 1.4;

✔ estiver alinhado ao ARCHITECTURE;

✔ estiver alinhado ao BUSINESS_MODEL;

✔ explicar claramente cada entidade;

✔ servir de referência para novos desenvolvedores.

---

# RELATÓRIO FINAL

Entregar:

* Resumo Executivo.
* Contextos identificados.
* Entidades documentadas.
* Relacionamentos.
* Agregados.
* Invariantes.
* Diferenças em relação ao documento anterior.
* Quality Gate.

Ao concluir, aguardar aprovação antes de iniciar qualquer outro documento.
