# Você já possui um feed ou lista de produtos? Mande o link. O ParaguAI cuida do resto.

> **Para o lojista** — versão em linguagem simples, sem jargão técnico.
> O ParaguAI aparece no seu site de busca de preços do Paraguai e da região
> de fronteira. Esta página explica o que precisamos de você (quase nada) e o
> que cuidamos por conta própria.

---

## 1. O que o ParaguAI precisa de você

Só **uma das opções abaixo** — a que sua loja **já possui**:

| O que você já tem | Formato |
|---|---|
| Um link de **feed de produtos** (XML) | ✅ ideal |
| Um link/arquivo **CSV** ou planilha de produtos | ✅ |
| Um **JSON** / API de catálogo | ✅ |
| Um **Google Merchant / shopping feed** | ✅ |
| Um **sitemap** de produtos (endereços das páginas) | 🟡 suficiente |
| Um catálogo no **site** (loja online) | 🟡 nós rastreamos |

**O ParaguAI se adapta à forma como você já trabalha.** Você não precisa criar
nenhum formato novo.

## 2. Campos mínimos (se você for gerar um arquivo)

Se for montar um arquivo do zero (opcional — você pode usar um que já tem):

| O que é | Campo |
|---|---|
| Identificador do produto (código/SKU da sua loja) | `codigo` |
| Nome do produto | `title` (ou `title_es`) |
| Preço | `preco` (moeda sua: dólar, guaraní, real) |
| Estoque (quantidade ou disponível/sem) | `estoque` e/ou `disponibilidade` |
| Marca | `marca` |
| Foto | `link_imagem` |
| Link da página do produto | `link` |

O que for opcional (descrição, categoria, preço com IVA, preço promocional,
tipo de venda) você envia se quiser — **quanto mais, melhor**, mas não é
obrigatório para começar.

Exemplo mínimo de um item:
```
title:  Smartphone Modelo X 256GB
codigo: 4455540
preco:  1150.00 USD
marca:  SuaMarca
estoque: 8
link_imagem: https://www.sualoja.com/imagens/x.jpg
link: https://www.sualoja.com/produto/x
```

> Valores de exemplo. Use os seus.

## 3. Como a atualização funciona

- Você **atualiza seu arquivo** no ritmo que já usa.
- O ParaguAI **busca seu link periodicamente** e reflete as mudanças de preço,
  estoque e disponibilidade.
- Não incomodamos você com cada produto. Você não faz nada além de manter o
  arquivo que já mantém.

## 4. Preciso me preocupar com segurança / roubo de dados?

- Usamos **https** (link seguro), nunca solicitamos senha, token nem acesso a
  áreas restritas do seu sistema.
- Se seu site só vende para cadastrados, você pode **liberar só a leitura do
  catálogo** (sem dados de clientes, sem faturamento, sem área restrita).
- Exibimos o **seu logo e seu link** — o consumidor clica e compra **na sua
  loja**, não no ParaguAI.

## 5. Responsabilidades

**Você (lojista):**
- Manter preço, estoque, marca e fotos atualizados no arquivo.
- Garantir que os produtos são legais, originais e com garantia, como já faz.

**O ParaguAI:**
- Ler e normalizar seu arquivo.
- Mostrar seu produto no site de comparação de preços.
- Levar o consumidor final para comprar **na sua loja**.
- Tratar os dados sem vender a terceiros nem expor o que é interno.

## 6. Não temos XML. E agora?

Sem problema — descemos um degrau na escada:

1. Tem **JSON** ou **API** de produtos? 🟢 envia o link
2. Tem **exportação CSV** do seu sistema/ERP? 🟢 envia o arquivo/link
3. Tem **Google Merchant / shopping feed**? 🟢 envia o link
4. Tem **sitemap** do site? 🟢 envia o link
5. Seu sistema **exporta produtos periodicamente** (relatório de preço/estoque)? 🟡 nos conta como
6. Nenhum dos casos? 🟤 nós rastreamos seu catálogo do site — mas é o menos
   ideal (mais frágil e mais demorado para refletir mudanças).

> Em todos os casos, **você continua do jeito que já trabalha**. Nós adaptamos
> o ParaguAI ao seu processo — não o contrário.

## 7. O que acontece depois que você envia o link

1. **Validamos**: conferimos que o link está acessível e o formato legível.
2. **Pré-visualizamos**: mostramos a você exatamente o que será publicado
   (produtos, preços, imagens) antes de qualquer coisa ir ao ar.
3. **Você aprova**.
4. **Ativamos**: o ParaguAI passa a exibir e atualizar seus produtos.

Nada é publicado sem a sua aprovação. Você vê primeiro.

---

*Dúvidas? Encaminhe esta página ao seu time de tecnologia e nos envie o link.*
