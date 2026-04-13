-- Leitura de avatares no bucket público: rotas autenticadas da Storage API
-- devem poder ler objetos de qualquer utilizador (URLs públicas em <img> já usam anon;
-- isto alinha o comportamento e evita falhas em clientes que enviam JWT.)

CREATE POLICY "storage_avatars_select_bucket_public_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- Atualizações em profiles (ex.: avatar_url) para o dashboard em tempo real
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
