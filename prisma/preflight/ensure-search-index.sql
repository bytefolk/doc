DO $$
BEGIN
  IF to_regclass('"Doc"') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Doc' AND column_name = 'contentSearch'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Doc' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE "Doc" ADD COLUMN "search_vector" tsvector;
  END IF;

  CREATE OR REPLACE FUNCTION "doc_search_vector_update"()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW."search_vector" :=
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW."contentSearch", '')), 'B');
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'doc_search_vector_trigger'
  ) THEN
    CREATE TRIGGER doc_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "Doc"
      FOR EACH ROW
      EXECUTE FUNCTION "doc_search_vector_update"();
  END IF;

  UPDATE "Doc"
  SET "search_vector" =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce("contentSearch", '')), 'B')
  WHERE "search_vector" IS NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'Doc_search_vector_idx'
  ) THEN
    CREATE INDEX "Doc_search_vector_idx" ON "Doc" USING GIN ("search_vector");
  END IF;
END
$$;
