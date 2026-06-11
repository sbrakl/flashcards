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

## Session Pooler connection

In Supabase, you don't get delicated IP for the database. 
IPv4 is paid addon, you need to pay $4 per month for delicated IP service
Supabase gives the option Session Pooler which doesn't have delicated IPv4
But has DNS entry aws-1-ap-northeast-1.pooler.supabase.com which points to your DB instance. 

![supabase-landing](./Supabase-landing.png)
![db-connection-options](./DB_Connection_Options.png)
![db-poller-connection](./Session_Poller_connection.png)
![db-ipv4-not-available](./db_ip4_notavailable.png)