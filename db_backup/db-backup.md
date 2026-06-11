# DB Backup instruction

## How to get the schema from the Supabase project

```bash
supabase db dump --db-url "postgresql://postgres.swffrwezqqayucpjtjeq:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" -f schema.sql
```
If 
⚠️ Important Note on Special Characters: If your database password contains any special characters (like @, #, $, :, /), you must URL-encode them inside the connection string. For example, if your password is My@Password, it should be written as My%40Password.


Password is save in https://clipperz.is/app/

## How to get the entire DB backup

```bash
pg_dump "postgresql://postgres.swffrwezqqayucpjtjeq:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"  > db_backup/2026_June_11/backup.sql
```


