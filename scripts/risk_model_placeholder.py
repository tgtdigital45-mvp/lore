"""
Placeholder para modelo preditivo de toxicidade (ex.: neuropatia).
Fluxo sugerido: exportar série temporal de `symptom_ae_responses` / `symptom_logs`,
calcular features, inferir probabilidade, gravar em `risk_scores` via Supabase service role
ou invocar a Edge Function `risk-projection-stub` até o modelo estar pronto.

Não executado pela CI — documentação de integração futura.
"""

def main() -> None:
    print("risk_model_placeholder: definir features e treino com dados reais + validação clínica.")


if __name__ == "__main__":
    main()
