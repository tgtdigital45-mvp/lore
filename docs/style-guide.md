Style Guide & Design Tokens
Documento: styleguide.md
Inspiração Visual: Apple Health (Saúde)
Objetivo: Padronizar cores, tipografia, espaçamentos e elevações para garantir uma interface clínica, elegante e de alto contraste, otimizando o desenvolvimento no React Native.
1. Paleta de Cores (Color Tokens)
O design deve suportar nativamente Light Mode e Dark Mode (crucial para pacientes lendo o app durante a noite no hospital ou em casa).
1.1. Cores de Superfície e Fundo (Neutras)
A interface é predominantemente branca ou preta, maximizando o "espaço em branco" para não sobrecarregar o usuário.
Token	Light Mode (HEX)	Dark Mode (HEX)	Uso / Função
background.primary	#FFFFFF	#000000	Fundo principal das telas (Scaffold/View).
background.secondary	#F2F2F7	#1C1C1E	Fundo de Cards, Modais e Áreas de destaque.
background.tertiary	#E5E5EA	#2C2C2E	Botões inativos ou fundos de inputs (TextInputs).
1.2. Tipografia e Ícones (Contraste)
Token	Light Mode (HEX)	Dark Mode (HEX)	Uso / Função
text.primary	#000000	#FFFFFF	Títulos grandes e números de dados (Ex: "37.5°").
text.secondary	#8E8E93	#98989D	Legendas, unidades médicas ("bpm", "°C") e descrições.
text.tertiary	#C7C7CC	#48484A	Placeholders de input e textos desabilitados.
border.divider	#E5E5EA	#38383A	Linhas divisórias muito sutis entre itens de lista.
1.3. Cores Semânticas de Dados (Vibrantes)
No ecossistema Onco, a cor comunica a categoria da informação clínica.
Token	Cor (HEX)	Categoria / Uso Clínico
semantic.vitals	#FF2D55 (Pink/Red)	Sinais vitais críticos (Febre, Frequência Cardíaca). Alertas de perigo.
semantic.respiratory	#32ADE6 (Cyan)	SpO2, Frequência Respiratória, Metas de Hidratação.
semantic.nutrition	#34C759 (Green)	Nutrição, Metas Concluídas, Exercícios (Preabilitação).
semantic.treatment	#5E5CE6 (Indigo)	Ciclos de Quimioterapia/Rádio, Lembretes de Medicamentos.
semantic.symptoms	#FF9500 (Orange)	Sintomas reportados (Dor, Náusea, Fadiga) e Alertas de Atenção (Amarelos).
2. Tipografia (Typography Tokens)
O app simula a estética nativa em ambas as plataformas.
Família (React Native): Platform.OS === 'ios' ? 'System' : 'Inter' (A fonte System no iOS invoca automaticamente a SF Pro).
Hierarquia (Human Interface Guidelines)
O uso pesado de contraste entre Títulos Gigantes e textos de apoio minúsculos é a assinatura visual do projeto.
Token	Tamanho (Size)	Peso (Weight)	Altura da Linha (Line-Height)	Aplicação
Large Title	34px	700 (Bold)	41px	Títulos principais das abas (Ex: "Resumo").
Title 1	28px	700 (Bold)	34px	Títulos de seções grandes.
Title 2	22px	600 (Semibold)	28px	Cabeçalhos de Cards.
Headline	17px	600 (Semibold)	22px	Destaques no texto, botões primários.
Body	17px	400 (Regular)	22px	Textos longos, orientações médicas da IA.
Callout	16px	400 (Regular)	21px	Mensagens de alerta/dicas.
Subhead	15px	400 (Regular)	20px	Subtítulos ou rótulos de listas.
Footnote	13px	400 (Regular)	18px	Notas de rodapé, "powered by AI".
Caption 1	12px	400 (Regular)	16px	Unidades médicas pequenas ("bpm", "mL").
Token Especial (Data Huge): Tamanho 40px a 52px, Peso 800 (Heavy). Usado apenas para exibir o número cru do dado central do dia.
3. Espaçamento, Layout e Bordas (Spacings & Radii)
Um grid de 8 pontos garante proporções matemáticas perfeitas na UI.
3.1. Espaçamentos (Paddings & Margins)
Token	Valor	Uso Recomendado
spacing.xs	4px	Distância entre um ícone pequeno e um texto.
spacing.sm	8px	Distância padrão entre elementos vizinhos dentro de um card.
spacing.md	16px	Padding interno padrão de Cards e Margem lateral da tela.
spacing.lg	24px	Margem entre seções diferentes da tela.
spacing.xl	32px	Margem massiva para criar respiro visual entre blocos grandes.
3.2. Arredondamentos (Border Radius)
Cards arredondados transmitem conforto e segurança (elimina as "arestas duras" do design hospitalar).
Token	Valor	Uso Recomendado
radius.sm	8px	Botões pequenos, ícones contornados.
radius.md	12px	Inputs de texto, modais menores.
radius.lg	16px	Cards Principais de Dados (Padrão ouro para o app).
radius.xl	24px	Bottom sheets (Gavetas que sobem de baixo), Modais de tela cheia.
4. Implementação Técnica (TypeScript / React Native)
Exemplo de como esses tokens devem ser estruturados no repositório de código (ex: src/theme/theme.ts):
export const lightTheme = {
  colors: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F2F2F7',
      tertiary: '#E5E5EA',
    },
    text: {
      primary: '#000000',
      secondary: '#8E8E93',
      tertiary: '#C7C7CC',
    },
    semantic: {
      vitals: '#FF2D55',
      respiratory: '#32ADE6',
      nutrition: '#34C759',
      treatment: '#5E5CE6',
      symptoms: '#FF9500',
    }
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
  },
  radius: {
    sm: 8, md: 12, lg: 16, xl: 24,
  }
};
// Exportamos a tipagem para o Intellisense (Autocomplete) funcionar em todo o app.
export type Theme = typeof lightTheme;
